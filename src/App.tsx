import { Routes, Route, Navigate } from 'react-router-dom'
import { PayrollProvider } from './context/PayrollContext'
import { ThemeProvider } from './context/ThemeContext'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import AddEmployees from './pages/AddEmployees'
import RunPayroll from './pages/RunPayroll'
import EmployeeView from './pages/EmployeeView'
import ComplianceReport from './pages/ComplianceReport'

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
      <Route path="/employees" element={<Layout><AddEmployees /></Layout>} />
      <Route path="/payroll" element={<Layout><RunPayroll /></Layout>} />
      <Route path="/employee" element={<Layout><EmployeeView /></Layout>} />
      <Route path="/compliance" element={<Layout><ComplianceReport /></Layout>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <PayrollProvider>
        <AppRoutes />
      </PayrollProvider>
    </ThemeProvider>
  )
}
