# Memento — React Native mobile

Source chính của app nằm ngay trong thư mục `Non_F`. Ứng dụng viết bằng TypeScript, React Native và Expo; giao diện dùng native components, không nhúng bản web bằng WebView. Mã React/Vite/Capacitor cũ được giữ tại `legacy/web` để đối chiếu khi chuyển đổi.

## Cấu trúc để bảo trì

| Thư mục / file       | Trách nhiệm                                            |
| -------------------- | ------------------------------------------------------ |
| `src/App.tsx`        | Khởi tạo app, điều kiện đăng nhập và khung màn hình    |
| `src/navigation/`    | Route có kiểu dữ liệu và ánh xạ route → màn hình       |
| `src/hooks/`         | Vòng đời phiên đăng nhập, điều hướng, profile và push  |
| `src/screens/`       | Giao diện theo chức năng                               |
| `src/lib/`           | Supabase, nghiệp vụ và xác thực CAPTCHA                |
| `config/android.cjs` | Một nơi cấu hình SDK, Build Tools, NDK, ABI và tên APK |
| `scripts/`           | Cài SDK, build, xác minh chữ ký và kiểm thử            |
| `legacy/web/`        | Bản web cũ và ghi chú sửa lỗi cũ, giữ để tra cứu       |

Không sửa trực tiếp thư mục `android/` sinh tự động. Thay đổi cấu hình Expo hoặc `plugins/` rồi prebuild lại. Khi nâng Expo/React Native, cập nhật `config/android.cjs` theo SDK tương ứng; CI và công cụ xác minh APK cùng đọc file này.

## Chạy Android

```powershell
cd "D:\ky 8\EXE202\app\Non_F"
npm install
npm run android
```

Cần Android Studio, JDK 17 và máy ảo Android đang chạy hoặc điện thoại bật USB debugging. `npm run android` build và cài app development. Những lần sau dùng `npm start` để mở Metro cho development client rồi chạy app đã cài. Có thể mở Expo Go bằng `npm run start:go` khi client hỗ trợ SDK của dự án. Bản APK release chứa JavaScript và Hermes bytecode nên không cần Metro hay localhost khi sử dụng.

## Tải APK từ GitHub

[Tải APK mới nhất](https://github.com/lenhatminh2102/App-Memento/releases/latest/download/memento.apk)

[Theo dõi GitHub Actions](https://github.com/lenhatminh2102/App-Memento/actions/workflows/android-apk.yml)

Link tải chỉ hoạt động sau khi workflow đầu tiên thành công. Mỗi push lên `main`, tag `v*` hoặc lần chạy thủ công sẽ kiểm tra TypeScript, chạy test, build APK có ký và xuất GitHub Release. Pull request chỉ chạy kiểm tra, không truy cập khóa ký. File APK cũng được lưu trong Actions Artifacts 30 ngày, cùng SHA-256.

Điện thoại Android cần cho phép trình duyệt cài ứng dụng từ nguồn tải về. Package ID là `vn.memento.app`. Nếu đang có bản Capacitor cũ ký bằng khóa khác, cần gỡ bản cũ trước khi cài bản mới; dữ liệu máy chủ không bị xóa nhưng dữ liệu cục bộ của bản gỡ sẽ mất.

## GitHub Actions Secrets

Cấu hình tại Settings → Secrets and variables → Actions:

| Secret                          | Nội dung                                                |
| ------------------------------- | ------------------------------------------------------- |
| `EXPO_PUBLIC_SUPABASE_URL`      | URL dự án Supabase                                      |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Anon/public key, không phải service-role key            |
| `GOOGLE_SERVICES_JSON`          | Nội dung cấu hình Firebase Android tương ứng package ID |
| `ANDROID_KEYSTORE_BASE64`       | Keystore ký release mã hóa Base64                       |
| `ANDROID_KEYSTORE_PASSWORD`     | Mật khẩu keystore                                       |
| `ANDROID_KEY_ALIAS`             | Alias khóa ký                                           |
| `ANDROID_KEY_PASSWORD`          | Mật khẩu khóa ký                                        |

Khóa ký phải được giữ ổn định để các APK sau cài cập nhật được lên bản trước. Bản sao lưu khóa và mật khẩu được giữ tại `.ci-local` trên máy đã cấu hình; thư mục này bị Git ignore. Không commit `.env`, `google-services.json`, keystore hoặc mật khẩu vào repo. Các giá trị Supabase public được đóng gói trong ứng dụng theo thiết kế; quyền dữ liệu phải được backend bảo vệ bằng RLS.

## Build và kiểm tra cục bộ

```powershell
npm run check
npm test
npm run bundle:android
npm run apk
```

Lệnh kiểm tra chung: `npm run validate` (TypeScript, định dạng và unit test). Dùng `npm run format` để định dạng lại code. Kiểm tra import/biến không sử dụng được bật trong `tsconfig.json`; CI cũng kiểm tra định dạng để tránh code lại bị dồn thành các dòng khó đọc.

Nếu máy thiếu gói SDK và đã có `sdkmanager` trong PATH, chạy `npm run android:sdk` một lần. Build bằng `npm run apk`; script tạo cả `build/memento.apk` và `build/memento.apk.sha256`. Với đầy đủ biến khóa ký release, chạy thêm `npm run apk:verify` để xác nhận APK dùng đúng chứng chỉ. CI thực hiện cả build lẫn xác minh tự động.

APK nằm tại `build/memento.apk`. Nếu build không có cấu hình `MEMENTO_KEYSTORE_FILE`, template Expo sử dụng khóa debug; workflow CI đã cấu hình khóa release riêng. `MEMENTO_KEYSTORE_FILE`, `MEMENTO_KEYSTORE_PASSWORD`, `MEMENTO_KEY_ALIAS`, `MEMENTO_KEY_PASSWORD` điều khiển ký release. Biến `MEMENTO_ANDROID_NDK_VERSION` cho phép chọn NDK cài sẵn nếu cần.

Copy `.env.example` thành `.env` và điền hai cấu hình Supabase public để chạy local. Thêm `google-services.json` ở thư mục gốc để bật FCM Android. Phiên đăng nhập dùng AsyncStorage; ảnh dùng camera/thư viện native; app dùng lại database và RPC hiện có.

## Đăng nhập với hCaptcha

App dùng lại site key hCaptcha public của bản gốc. Có thể cấu hình bằng EXPO_PUBLIC_HCAPTCHA_SITE_KEY; không đưa secret key hCaptcha vào app. Supabase phải bật CAPTCHA với nhà cung cấp hCaptcha và secret khớp site key này.

Web dùng widget chính thức @hcaptcha/react-hcaptcha. Bản xem thử tự chuyển localhost:8081 sang memento.localhost:8081 vì hCaptcha không hỗ trợ hostname localhost/127.0.0.1. Tên miền \*.localhost vẫn trỏ về máy đang chạy Expo, không cần sửa file hosts.

Android/iOS dùng SDK @hcaptcha/react-native-hcaptcha trong cửa sổ xác minh riêng. WebView chỉ phục vụ thử thách CAPTCHA; giao diện ứng dụng vẫn dùng React Native.

Đăng nhập, đăng ký, quên mật khẩu, gửi lại mã và gửi OTP cho thay đổi tài khoản đều truyền options.captchaToken. Token chỉ dùng cho một request và được reset sau mỗi lần thử. OTP verify không tái sử dụng token cũ. Kiểm tra mật khẩu của người đã đăng nhập dùng RPC verify_my_password như bản gốc.

Chạy npm run test:auth để kiểm tra Supabase đang chặn request không có CAPTCHA. Đây không phải bài test đăng nhập bằng tài khoản thật; người dùng cần tự hoàn thành thử thách và nhập thông tin đăng nhập để nghiệm thu toàn bộ luồng.

## Trạng thái chuyển đổi

Đã có các luồng native chính: đăng nhập/đăng ký/OTP, onboarding, khám phá, hồ sơ/portfolio/đánh giá, đặt lịch, thanh toán QR, bàn giao ảnh, chỉnh sửa ảnh, hủy song phương/hoàn tiền, chat realtime, thông báo, yêu cầu tìm nhiếp ảnh gia và đề nghị nhận đơn, hồ sơ cá nhân, đổi email/mật khẩu, xóa tài khoản, đăng ký/cập nhật và duyệt nhiếp ảnh gia.

Chưa đạt đầy đủ tương đương mọi chi tiết của bản cũ: chat riêng của đề nghị, quản lý đề nghị đã gửi, báo cáo/tim ảnh, bộ lọc nâng cao, badge chưa đọc, tùy chọn thông báo, các màn quản trị thanh toán/báo cáo, email hỗ trợ và analytics. Cần nghiệm thu trên thiết bị và tiếp tục chuyển những phần này trước khi coi bản native là thay thế production hoàn chỉnh. Push iOS cần cấu hình APNs riêng; build iOS cần macOS.
