export const products = [
  {
    "id": "AURA-HONG-01",
    "name": "Túi charm dịu dàng",
    "category": "Túi",
    "price": 500000,
    "image": "/images/au4.webp",
    "description": "Một điểm nhấn nhỏ cho outfit hằng ngày. Khám phá thiết kế và chi tiết qua ảnh sản phẩm."
  },
  {
    "id": "AURA-CAM-02",
    "name": "Túi mini quai caramel",
    "category": "Túi",
    "price": 380000,
    "image": "/images/au2.webp",
    "description": "Phối cùng áo sáng màu cho một tổng thể nhẹ nhàng. Kiểu dáng và phụ kiện được thể hiện trong ảnh."
  },
  {
    "id": "AURA-TRANG-03",
    "name": "Túi trắng thanh lịch",
    "category": "Túi",
    "price": 470000,
    "image": "/images/au3.webp",
    "description": "Sắc sáng dễ kết hợp, từ buổi cà phê đến những cuộc hẹn cuối tuần."
  },
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
    "price": 270000,
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
