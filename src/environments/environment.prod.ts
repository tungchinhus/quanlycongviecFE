export const environment = {
  production: true,
  firebase: {
    apiKey: "AIzaSyDUTNZdPF7cGj5YsoC3RNq1iF6e7BYI7as",
    authDomain: "quanlyfiles-9891e.firebaseapp.com",
    projectId: "quanlyfiles-9891e",
    storageBucket: "quanlyfiles-9891e.firebasestorage.app",
    messagingSenderId: "373646706069",
    appId: "1:373646706069:web:70f0cf79c1031471b6e29c",
    measurementId: "G-GJTTZC70Y2"
  },
  apiUrl: 'http://172.20.115.40:8080/api', // Cập nhật URL API production của bạn
  // Python service Tra Cứu Files (SERVER) — hiện dùng cho indexer.
  // LƯU Ý: phải dùng IP/host của server, KHÔNG dùng localhost (localhost sẽ là máy người dùng).
  pythonServiceUrl: 'http://172.20.115.40:8100',
  // Python helper trên CLIENT — mở Explorer / chọn thư mục. Chạy local trên mỗi máy user.
  pythonClientUrl: 'http://localhost:8100',
  // false = gọi Python service trên máy user (pythonClientUrl) → Explorer mở và focus file trên máy user. Cần chạy Python service (C:\python-service, port mặc định 8100) trên mỗi máy.
  // true = gọi backend /api/files/open-in-explorer → Explorer mở trên SERVER (chỉ dùng khi mở app ngay trên server, VD RDP).
  openInExplorerUseBackend: false,
  // (Các key MSAL/Graph cho OneDrive đã bị gỡ khỏi project khi bỏ `onedrive-search`)
};

