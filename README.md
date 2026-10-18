# AURA L’AMOUR — React shop

Bộ mã React + Vite, máy chủ Node.js và SQLite. Thiết kế thời trang lấy cảm hứng từ bố cục CowKitty; không phải website chính thức của CowKitty. Ảnh sản phẩm là 5 ảnh au1–au5 bạn cung cấp; mã và giá được cập nhật theo ảnh bảng hàng. Mô tả là nội dung biên tập; shop cần xác nhận thông số, màu, size và chính sách trước khi mở bán.

## 1. Chạy trong VS Code

Cài Node.js 22.13 trở lên (khuyên dùng Node 24 LTS) và VS Code. Giải nén ZIP, mở đúng thư mục `aura-shop` bằng File → Open Folder.

Mở Terminal → New Terminal:

```bash
npm install
```

Copy file `.env.example` thành `.env`. Trên macOS:

```bash
cp .env.example .env
```

Điền ADMIN_KEY bằng chuỗi bí mật ngẫu nhiên ít nhất 24 ký tự. Có thể tạo bằng:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Terminal thứ nhất:

```bash
npm run server
```

Mở terminal thứ hai, cùng thư mục:

```bash
npm run dev
```

Vào http://localhost:5173. Cả hai terminal phải tiếp tục chạy. Nếu tắt server, khách không thể tải sản phẩm hoặc lưu đơn. SQLite có thể hiển thị cảnh báo experimental của Node.

## 2. Thay nội dung

- `server/products.js`: tên, giá VND, danh mục (chỉ Áo hoặc Túi), đường dẫn ảnh, mô tả. ID sản phẩm phải duy nhất và ổn định để dùng cho catalog quảng cáo.
- `src/main.jsx`: thương hiệu dạng chữ, banner, giới thiệu, chính sách.
- `src/style.css`: màu, font hệ thống hỗ trợ tiếng Việt, bố cục responsive.
- Thêm ảnh thật vào `public/images`, đặt image là `/images/ten-anh.jpg`.
- Thay banner bằng ảnh của bạn. Thêm địa chỉ cửa hàng, email, số hỗ trợ, điều kiện giao/đổi trả và chính sách dữ liệu đúng thực tế.
- Font hệ thống, ảnh trong `public/images`, không phụ thuộc Google Fonts hoặc Unsplash.

## 3. Meta Pixel / Facebook Ads

Trong `.env`, điền Pixel/Dataset ID của chính bạn (chuỗi số):

```dotenv
VITE_META_PIXEL_ID=YOUR_NUMERIC_PIXEL_ID
VITE_TRACK_COD_PURCHASE=false
```

Khởi động lại `npm run dev` sau khi sửa. Khi build production, các biến VITE được nhúng vào frontend: phải build lại sau khi đổi ID. Pixel ID là công khai; không bao giờ đặt access token hoặc ADMIN_KEY vào biến VITE.

Các sự kiện đã nối vào đúng hành động:

| Sự kiện | Khi nào |
| --- | --- |
| PageView | Tải trang hoặc bắt đầu đồng ý quảng cáo |
| ViewContent | Mở chi tiết sản phẩm |
| AddToCart | Thêm sản phẩm vào giỏ |
| InitiateCheckout | Bắt đầu nhập thông tin nhận hàng |
| OrderPlaced (custom) | Máy chủ đã lưu đơn COD thành công |
| Purchase (tùy chọn) | Cùng thời điểm lưu đơn COD, chỉ nếu bật biến bên dưới |

Mặc định **không phát Purchase**, vì đặt COD chưa phải đã trả tiền. Nếu bạn chủ động muốn tối ưu theo đơn COD đã đặt, đặt `VITE_TRACK_COD_PURCHASE=true`. Khi đó Purchase thể hiện đơn được tiếp nhận, không thể hiện thanh toán thành công hoặc giao hàng thành công. Giá trị event là tổng tiền gồm phí vận chuyển, currency VND. Đơn bị hủy/không nhận chưa được điều chỉnh tự động trên Meta.

Không tải Pixel khi khách chưa đồng ý. Nút “Chỉ cần thiết” vẫn cho mua hàng. Footer có “Tùy chọn cookie” để thay đổi hoặc rút đồng ý; lịch sử đã gửi không thể thu hồi bằng nút này. Tên, số điện thoại, địa chỉ, ghi chú không được gắn vào payload Pixel trong mã này. Meta có thể xử lý dữ liệu kỹ thuật/cookie khi Pixel chạy; cần hoàn thiện chính sách và cấu hình tài khoản trước khi sử dụng thực tế.

Kiểm tra: mở Events Manager của bạn → Test Events, mở website, đồng ý cookie quảng cáo, xem sản phẩm → thêm giỏ → bắt đầu đặt hàng → gửi đơn. Có thể dùng Meta Pixel Helper để kiểm tra thêm. Chặn quảng cáo, trình duyệt và lựa chọn cookie có thể làm mất sự kiện. Chưa xác minh với tài khoản Meta thực tế vì chưa có Pixel ID của bạn.

Tham khảo tài liệu chính thức:
- https://developers.facebook.com/docs/meta-pixel/
- https://developers.facebook.com/docs/meta-pixel/implementation/conversion-tracking/

Đây là browser Pixel; chưa tích hợp Conversions API, thanh toán online hay gửi email/SMS. Pixel ghi nhận hành vi để đo lường/tạo tệp theo công cụ Meta, không cung cấp danh sách danh tính từng khách truy cập.

## 4. Xem đơn đã lưu

Đơn lưu tại `data/orders.sqlite`, không phải chỉ trong localStorage. Không đưa file dữ liệu hoặc `.env` lên thư mục công khai/Git. Sao lưu cả thư mục data bằng SQLite backup hoặc khi server đã tắt; file -wal có thể chứa dữ liệu chưa checkpoint.

API quản trị đọc tối đa 500 đơn mới nhất, bắt buộc Bearer ADMIN_KEY. Không có trang admin chỉnh sửa. Ví dụ trong terminal của bạn:

```bash
curl http://localhost:3001/api/orders -H 'Authorization: Bearer REPLACE_WITH_YOUR_ADMIN_KEY'
```

Không nhập ADMIN_KEY vào frontend. Response có thông tin nhận hàng, chỉ truy cập trên máy chủ/máy được tin cậy, dùng HTTPS khi online. Chưa có thông báo đơn tự động; chủ shop phải kiểm tra API để xử lý đơn.

## 5. Chạy bản production

```bash
npm test
npm run build
npm start
```

Vào http://localhost:3001. `npm start` phục vụ cả frontend đã build và API. Muốn khách mua được, cần đưa lên máy chủ Node có **ổ đĩa lưu bền vững**, thiết lập HTTPS/domain, biến môi trường, sao lưu và giám sát. Bản này dành cho một instance Node.

**Không đưa nguyên backend SQLite này lên Vercel Functions:** lưu trữ cục bộ của serverless không phù hợp cho đơn hàng bền vững. Nếu dùng Vercel, cần chuyển lưu đơn sang database managed (Postgres/Supabase) và API phù hợp. Chưa tự deploy, chưa nối tên miền hiện có của bạn.

Trước khi mở bán: thay ảnh/hàng/giá thật; kiểm tra nhận đơn; bổ sung liên hệ và chính sách; cấu hình Pixel ID; chạy Test Events; thiết lập theo dõi và sao lưu đơn. Chưa có quản lý tồn kho, thanh toán online, vận chuyển tự động, tài khoản khách, email xác nhận, đổi trả, thuế hoặc quy trình quản trị đầy đủ. Không nhận thông tin thẻ trên form này.

## Kiểm tra nhanh

- Tìm/lọc/sắp xếp; mở sản phẩm; thêm, tăng/giảm, xóa giỏ.
- Reload vẫn giữ giỏ; checkout hợp lệ tạo một đơn.
- Request trùng Idempotency-Key và nội dung trả lại cùng đơn; payload khác cùng key bị từ chối.
- Giá giả từ browser bị bỏ qua; sản phẩm/số lượng sai bị từ chối.
- Từ chối quảng cáo không tải fbevents.js; mua hàng vẫn hoạt động.
- Purchase mặc định tắt. Bật tùy chọn COD chỉ sau khi hiểu ý nghĩa chỉ số.


## Bản cập nhật danh mục và giao diện

| Mã | Giá | Danh mục | Ảnh |
| --- | ---: | --- | --- |
| AURA-HONG-01 | 500.000₫ | Túi | au4.jpg |
| AURA-CAM-02 | 380.000₫ | Túi | au2.jpg |
| AURA-TRANG-03 | 470.000₫ | Túi | au3.jpg |
| AURA-KHOAC-04 | 185.000₫ | Áo | au1.jpg |
| AURA-VAY-05 | 270.000₫ | Áo | au5.jpg |

Mẫu AURA-VAY-05 là bộ áo/váy trong ảnh, xếp vào Áo theo yêu cầu chỉ dùng hai danh mục. Ảnh au5 được cung cấp khác bố cục ảnh váy đen/trắng trong bảng mã; chưa có ảnh gốc đó nên dùng au5. Kiểm tra lại thành phần bộ và giá trước khi bán. AURA-HONG-01 giữ nguyên mã trong bảng dù ảnh nhìn xanh nhạt; không tự đổi mã.

Bộ lọc chính xác theo category; tìm theo tên, mã, có hoặc không dấu; sắp xếp giá; lưu yêu thích trên trình duyệt; gợi ý phối đồ; FAQ; ảnh vừa khung; không thêm đánh giá giả hoặc đếm ngược giả.

### Facebook / Instagram / TikTok

Điền URL tài khoản thật vào `.env`:

```dotenv
VITE_FACEBOOK_URL=
VITE_INSTAGRAM_URL=
VITE_TIKTOK_URL=
```

Chỉ nhận URL bắt đầu bằng https://. Khởi động lại dev hoặc build lại sau khi đổi. Khi URL trống, tên nền tảng chỉ là nhãn, không có link giả hoặc link tài khoản đoán. Có thể chỉnh trực tiếp giá trị trong `src/shop-config.js` nếu không dùng .env. Link mở tab mới kèm noopener/noreferrer.

### Nâng cấp dự án cũ

Sao lưu dự án cũ. Dùng mã nguồn mới, giữ `.env` riêng và thư mục `data` từ bản cũ nếu có đơn thật. ZIP không chứa .env, database hay node_modules. Chạy npm install, khởi động lại server và dev. Mã hàng đã đổi hoàn toàn nên giỏ hàng cũ chứa A01–A06 sẽ không được tính; xóa giỏ cũ nếu cần. Đơn lịch sử trong SQLite vẫn giữ nguyên bản ghi cũ.
