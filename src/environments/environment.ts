export const environment = {
  production: false,
  firebase: {
    apiKey: "AIzaSyDUTNZdPF7cGj5YsoC3RNq1iF6e7BYI7as",
    authDomain: "quanlyfiles-9891e.firebaseapp.com",
    projectId: "quanlyfiles-9891e",
    storageBucket: "quanlyfiles-9891e.firebasestorage.app",
    messagingSenderId: "373646706069",
    appId: "1:373646706069:web:70f0cf79c1031471b6e29c",
    measurementId: "G-GJTTZC70Y2"
  },
  apiUrl: 'http://localhost:5000/api', // Điều chỉnh theo URL API local của bạn
  /** URL Python service Tra Cứu Files (SERVER) — dùng cho indexer (GET /index/status, /index/trigger). Port phải trùng với PORT trong .env (mặc định 8100). */
  pythonServerUrl: 'http://localhost:8100',
  /**
   * URL Python helper trên CLIENT — chỉ dùng để mở Explorer / chọn thư mục.
   * Mặc định chạy local trên mỗi máy client.
   */
  pythonClientUrl: 'http://localhost:8100',
  // false = gọi Python local (pythonClientUrl) → Explorer mở trên máy dev. Chạy Python service (C:\python-service, port mặc định 8100).
  // true = gọi backend → Explorer mở trên server.
  openInExplorerUseBackend: false,
  /**
   * (Các key MSAL/Graph cho OneDrive đã bị gỡ khỏi project khi bỏ `onedrive-search`)
   */
};

