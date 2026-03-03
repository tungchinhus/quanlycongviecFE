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
  /** URL Python service Tra Cứu Files (SERVER) — dùng cho search + indexer */
  pythonServerUrl: 'http://localhost:8000',
  /**
   * URL Python helper trên CLIENT — chỉ dùng để mở Explorer / chọn thư mục.
   * Mặc định chạy local trên mỗi máy client.
   */
  pythonClientUrl: 'http://localhost:8000'
};

