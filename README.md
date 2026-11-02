# Memento — React Native mobile

Source chính của app nằm ngay trong thư mục `Non_F`. Ứng dụng viết bằng TypeScript, React Native và Expo; giao diện dùng native components, không nhúng bản web bằng WebView. Mã React/Vite/Capacitor cũ được giữ tại `legacy/web` để đối chiếu khi chuyển đổi.

## Chạy Android

```powershell
cd "D:\ky 8\EXE202\app\Non_F"
npm install
npm run android
```

Cần Android Studio, JDK 17 và máy ảo Android đang chạy hoặc điện thoại bật USB debugging. `npm run android` build và cài app development. Những lần sau dùng `npm start` để mở Metro rồi chạy app đã cài. Bản APK release chứa JavaScript và Hermes bytecode nên không cần Metro hay localhost khi sử dụng.

## Tải APK từ GitHub

[Tải APK mới nhất](https://github.com/lenhatminh2102/App-Memento/releases/latest/download/memento.apk)

[Theo dõi GitHub Actions](https://github.com/lenhatminh2102/App-Memento/actions/workflows/android-apk.yml)

Link tải chỉ hoạt động sau khi workflow đầu tiên thành công. Mỗi push lên `main`, tag `v*` hoặc lần chạy thủ công sẽ kiểm tra TypeScript, chạy test, build APK có ký và xuất GitHub Release. Pull request chỉ chạy kiểm tra, không truy cập khóa ký. File APK cũng được lưu trong Actions Artifacts 30 ngày, cùng SHA-256.

Điện thoại Android cần cho phép trình duyệt cài ứng dụng từ nguồn tải về. Package ID là `vn.memento.app`. Nếu đang có bản Capacitor cũ ký bằng khóa khác, cần gỡ bản cũ trước khi cài bản mới; dữ liệu máy chủ không bị xóa nhưng dữ liệu cục bộ của bản gỡ sẽ mất.

## GitHub Actions Secrets

Cấu hình tại Settings → Secrets and variables → Actions:

| Secret | Nội dung |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | URL dự án Supabase |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Anon/public key, không phải service-role key |
| `GOOGLE_SERVICES_JSON` | Nội dung cấu hình Firebase Android tương ứng package ID |
| `ANDROID_KEYSTORE_BASE64` | Keystore ký release mã hóa Base64 |
| `ANDROID_KEYSTORE_PASSWORD` | Mật khẩu keystore |
| `ANDROID_KEY_ALIAS` | Alias khóa ký |
| `ANDROID_KEY_PASSWORD` | Mật khẩu khóa ký |

Khóa ký phải được giữ ổn định để các APK sau cài cập nhật được lên bản trước. Bản sao lưu khóa và mật khẩu được giữ tại `.ci-local` trên máy đã cấu hình; thư mục này bị Git ignore. Không commit `.env`, `google-services.json`, keystore hoặc mật khẩu vào repo. Các giá trị Supabase public được đóng gói trong ứng dụng theo thiết kế; quyền dữ liệu phải được backend bảo vệ bằng RLS.

## Build và kiểm tra cục bộ

```powershell
npm run check
npm test
npm run bundle:android
npm run apk
```

APK nằm tại `build/memento.apk`. Nếu build không có cấu hình `MEMENTO_KEYSTORE_FILE`, template Expo sử dụng khóa debug; workflow CI đã cấu hình khóa release riêng. `MEMENTO_KEYSTORE_FILE`, `MEMENTO_KEYSTORE_PASSWORD`, `MEMENTO_KEY_ALIAS`, `MEMENTO_KEY_PASSWORD` điều khiển ký release. Biến `MEMENTO_ANDROID_NDK_VERSION` cho phép chọn NDK cài sẵn nếu cần.

Copy `.env.example` thành `.env` và điền hai cấu hình Supabase public để chạy local. Thêm `google-services.json` ở thư mục gốc để bật FCM Android. Phiên đăng nhập dùng AsyncStorage; ảnh dùng camera/thư viện native; app dùng lại database và RPC hiện có.

## Đăng nhập không dùng CAPTCHA

App không nhúng CAPTCHA và không gửi `captchaToken`. Trong đúng dự án Supabase mà `EXPO_PUBLIC_SUPABASE_URL` trỏ tới, mở Authentication → Attack Protection, tắt Enable CAPTCHA protection rồi lưu. Bỏ widget trong code không thay đổi cấu hình CAPTCHA của Supabase hosted.

Chạy `npm run test:auth` để kiểm tra backend đã ngừng yêu cầu CAPTCHA. Lệnh chỉ gửi một lần đăng nhập với tài khoản giả `example.invalid`, không tạo tài khoản và không dùng mật khẩu thật. Kết quả `invalid_credentials` là kết quả mong đợi của phép thử này: request đã đến bước kiểm tra thông tin đăng nhập thay vì bị CAPTCHA chặn. Nó không thay thế việc đăng nhập thử bằng tài khoản thật.

Lỗi CAPTCHA, sai mật khẩu, email chưa xác nhận và lỗi mạng được hiển thị trực tiếp trên form đăng nhập, kể cả khi mở bản web xem thử. Không đặt khóa quản trị hay service-role key trong app để né CAPTCHA.

## Trạng thái chuyển đổi

Đã có các luồng native chính: đăng nhập/đăng ký/OTP, onboarding, khám phá, hồ sơ/portfolio/đánh giá, đặt lịch, thanh toán QR, bàn giao ảnh, chỉnh sửa ảnh, hủy song phương/hoàn tiền, chat realtime, thông báo, yêu cầu tìm nhiếp ảnh gia và đề nghị nhận đơn, hồ sơ cá nhân, đổi email/mật khẩu, xóa tài khoản, đăng ký/cập nhật và duyệt nhiếp ảnh gia.

Chưa đạt đầy đủ tương đương mọi chi tiết của bản cũ: chat riêng của đề nghị, quản lý đề nghị đã gửi, báo cáo/tim ảnh, bộ lọc nâng cao, badge chưa đọc, tùy chọn thông báo, các màn quản trị thanh toán/báo cáo, email hỗ trợ và analytics. Cần nghiệm thu trên thiết bị và tiếp tục chuyển những phần này trước khi coi bản native là thay thế production hoàn chỉnh. Push iOS cần cấu hình APNs riêng; build iOS cần macOS.
