export const products = [
  {
    "id": "AURA-KHOAC-04",
    "name": "Áo khoác dệt thoáng",
    "category": "Áo",
    "price": 185000,
    "image": "/images/au1.webp",
    "description": "Một lớp áo nhẹ tạo điểm nhấn cho trang phục. Ghi chú màu và size mong muốn khi đặt hàng để shop xác nhận."
  },
  {
    "id": "AURA-VAY-05",
    "name": "Bộ áo & váy thanh lịch",
    "category": "Áo",
    "price": 275000,
    "image": "/images/au5.webp",
    "description": "Gợi ý phong cách mềm mại trong ảnh. Shop sẽ xác nhận mẫu, thành phần bộ và size trước khi giao."
  }
];
export function priceOrder(items){
 if(!Array.isArray(items)||!items.length||items.length>30)throw Error('Giỏ hàng không hợp lệ.');
 const seen=new Set();
 const lines=items.map(i=>{const p=products.find(p=>p.id===i.id);if(!p||!Number.isInteger(i.quantity)||i.quantity<1||i.quantity>20||seen.has(i.id))throw Error('Sản phẩm hoặc số lượng không hợp lệ.');seen.add(i.id);return {id:p.id,name:p.name,price:p.price,quantity:i.quantity};});
 const subtotal=lines.reduce((s,i)=>s+i.price*i.quantity,0);const shipping=subtotal>=1000000?0:30000;return {items:lines,subtotal,shipping,total:subtotal+shipping};
}
