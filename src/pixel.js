const id=import.meta.env.VITE_META_PIXEL_ID;
let allowed=false, initialized=false;
export function consent(value){
 allowed=value;localStorage.setItem('aura-consent',value?'yes':'no');
 if(!value){window.fbq?.('consent','revoke');return;}
 if(!id||!/^\d+$/.test(id))return;
 if(!initialized){
 const q=window.fbq=function(){q.callMethod?q.callMethod.apply(q,arguments):q.queue.push(arguments)};q.queue=[];q.loaded=true;q.version='2.0';window._fbq=q;
 const script=document.createElement('script');script.async=true;script.src='https://connect.facebook.net/en_US/fbevents.js';document.head.appendChild(script);
 q('consent','grant');q('init',id);initialized=true;
 }else window.fbq('consent','grant');
 track('PageView');
}
export function track(name,data={},eventId){if(allowed&&initialized)window.fbq('track',name,data,eventId?{eventID:eventId}:undefined);}
export function custom(name,data){if(allowed&&initialized)window.fbq('trackCustom',name,data);}
export const productData=p=>({content_ids:[p.id],content_name:p.name,content_type:'product',value:p.price,currency:'VND'});
