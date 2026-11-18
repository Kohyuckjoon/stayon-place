import { AuthProvider } from './lib/AuthContext';
// react-router-dom에서 RouterProvider까지 한꺼번에 가져와야 합니다!
import { RouterProvider } from "react-router-dom"; 
import { router } from "./routes";
import { HelmetProvider } from 'react-helmet-async';
import { DialogHost } from './lib/dialog';

// export default function App() {
//   return (
//     <AuthProvider>
//       <RouterProvider router={router} />
//     </AuthProvider>
//   );
// }

export default function App() {
  return (
    // 2. 가장 바깥쪽이나 RouterProvider 상위에 HelmetProvider를 감싸줍니다.
    <HelmetProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
      {/* 사이트 공용 알림/확인 팝업 (lib/dialog.tsx의 showAlert/showConfirm이 여기에 그려짐) */}
      <DialogHost />
    </HelmetProvider>
  );
}
