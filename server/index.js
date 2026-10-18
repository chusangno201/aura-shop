import http from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {randomUUID,timingSafeEqual} from 'node:crypto';
import {mkdirSync,readFileSync,existsSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {products,priceOrder} from './products.js';
mkdirSync('data',{recursive:true});const db=new DatabaseSync('data/orders.sqlite');
db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, request_key TEXT UNIQUE, payload TEXT NOT NULL, created_at TEXT NOT NULL)');
const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
const limits=new Map();
const server=http.createServer(async(req,res)=>{try{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
 const path=new URL(req.url,'http://localhost').pathname;
 if(path==='/api/products'&&req.method==='GET')return json(res,200,products);
 if(path==='/api/orders'&&req.method==='GET'){
 const key=process.env.ADMIN_KEY||'';const given=(req.headers.authorization||'').replace(/^Bearer /,'');
 if(key.length<24||given.length!==key.length||!timingSafeEqual(Buffer.from(given),Buffer.from(key)))return json(res,401,{error:'Không được phép.'});
 return json(res,200,db.prepare('SELECT payload FROM orders ORDER BY created_at DESC LIMIT 500').all().map(r=>JSON.parse(r.payload)));
 }
 if(path==='/api/orders'&&req.method==='POST'){
 const origin=req.headers.origin;
 const allowedOrigins=new Set(
   (process.env.ALLOWED_ORIGINS ||
   'http://localhost:5173,http://127.0.0.1:5173,https://auralamour.vn,https://www.auralamour.vn')
   .split(',').map(s=>s.trim()).filter(Boolean)
 );
 let originOK=!origin;
 if(origin){
   try{
     const parsed=new URL(origin);
     originOK=allowedOrigins.has(parsed.origin)
       || parsed.host===req.headers.host;
   }catch{originOK=false;}
 }
 if(!originOK)return json(res,403,{error:'Nguồn yêu cầu không hợp lệ.'});
 const now=Date.now();for(const [k,v] of limits)if(now-v.time>600000)limits.delete(k);
 const ip=req.socket.remoteAddress;const limit=limits.get(ip)||{time:now,count:0};if(++limit.count>50)return json(res,429,{error:'Quá nhiều yêu cầu, vui lòng thử lại sau.'});limits.set(ip,limit);
 let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>16000)return json(res,413,{error:'Dữ liệu quá lớn.'});}
 let input;try{input=JSON.parse(body);}catch{return json(res,400,{error:'Dữ liệu không hợp lệ.'});}
 const key=req.headers['idempotency-key'];if(typeof key!=='string'||!/^[\w-]{16,80}$/.test(key))return json(res,400,{error:'Thiếu mã yêu cầu.'});
 const customer={};for(const field of ['name','phone','address','note'])customer[field]=String(input.customer?.[field]||'').trim();
 if(customer.name.length<2||customer.name.length>100||!/^(0|\+84)\d{9}$/.test(customer.phone)||customer.address.length<10||customer.address.length>500||customer.note.length>500)return json(res,400,{error:'Kiểm tra họ tên, số điện thoại Việt Nam và địa chỉ (ít nhất 10 ký tự).'});
 let priced;try{priced=priceOrder(input.items);}catch(e){return json(res,400,{error:e.message});}
 const prior=db.prepare('SELECT payload FROM orders WHERE request_key=?').get(key);
 if(prior){const saved=JSON.parse(prior.payload);if(JSON.stringify(saved.customer)!==JSON.stringify(customer)||JSON.stringify(saved.items)!==JSON.stringify(priced.items))return json(res,409,{error:'Mã yêu cầu đã dùng. Hãy gửi đơn mới.'});return json(res,200,{id:saved.id,total:saved.total,shipping:saved.shipping});}
 const order={id:'AURA-'+randomUUID(),...priced,customer,status:'pending_cod',createdAt:new Date().toISOString()};
 db.prepare('INSERT INTO orders VALUES (?,?,?,?)').run(order.id,key,JSON.stringify(order),order.createdAt);
 return json(res,201,{id:order.id,total:order.total,shipping:order.shipping});
 }
 if(path.startsWith('/api/'))return json(res,404,{error:'Không tìm thấy.'});
 if(!['GET','HEAD'].includes(req.method))return json(res,405,{error:'Phương thức không hỗ trợ.'});
 const root=resolve('dist');let file=resolve(root,'.'+decodeURIComponent(path));if(!file.startsWith(root+'/'))file=resolve(root,'index.html');
 if(!existsSync(file)||!extname(file))file=resolve(root,'index.html');
 const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png'};
 res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream'});res.end(req.method==='HEAD'?undefined:readFileSync(file));
 }catch(e){console.error(e.message);json(res,500,{error:'Máy chủ gặp lỗi. Vui lòng thử lại.'});}});
server.listen(Number(process.env.PORT)||3001,()=>console.log('AURA server: http://localhost:'+(process.env.PORT||3001)));
