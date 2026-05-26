import './App.css'
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import BackLogin from './backoffice/pages/login'
import FrontLogin from './frontoffice/pages/login'
import FrontAcceuil from './frontoffice/pages/acceuil'
import FicheProduct from './frontoffice/pages/ficheProduct'
import Panier from './frontoffice/pages/panier'
import Commandes from './frontoffice/pages/commandes'
import FicheCommande from './frontoffice/pages/ficheCommande'
import FrontOffice from './frontoffice/frontoffice'
import ProtectedRoute from './backoffice/components/ProtectedRoute'
import BackOffice from './backoffice/backoffice'
import BackofficeLayout from './backoffice/components/BackofficeLayout'
import ResetData from './backoffice/pages/ResetData'
import Import from './backoffice/pages/Import'
import OrderManagement from './backoffice/pages/OrderManagement'
import UpdateStock from './backoffice/pages/stockUpdate'
import Statistics from './backoffice/pages/Statistics'
import Remove_stock from './frontoffice/pages/remove_stock'

function App() {

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/front" replace />} />
        
        <Route path="/front" element={<FrontOffice />}>
          <Route index element={<FrontAcceuil />} />
          <Route path="product/:id" element={<FicheProduct />} />
          <Route path="cart" element={<Panier />} />
          <Route path="panier" element={<Panier />} />
          <Route path="commandes" element={<Commandes />} />
          <Route path="commandes/:id" element={<FicheCommande />} />
          <Route path="login" element={<FrontLogin />} />
        </Route>

        <Route path="/backoffice/login" element={<BackLogin />} />
        <Route path="/backoffice" element={<ProtectedRoute />}>
          <Route element={<BackofficeLayout />}>
            <Route index element={<BackOffice />} />
            <Route path="resetdata" element={<ResetData />} />
            <Route path="import" element={<Import />} />
            <Route path="stock" element={<UpdateStock />} />
            <Route path="orders" element={<OrderManagement />} />
            <Route path="statistics" element={<Statistics />} />
          </Route>
        </Route>

        <Route path="/front" element={<ProtectedRoute />}>
          <Route path="stock" element={<Remove_stock />} />
        </Route>

      </Routes>
    </BrowserRouter>
  )
}


export default App
