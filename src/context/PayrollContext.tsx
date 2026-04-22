import { createContext, useContext, useState, type ReactNode } from 'react'

export interface Employee {
  id: string
  name: string
  walletAddress: string
  salary: number // in USDC
  department: string
  addedAt: string
}

export interface PayrollRun {
  id: string
  date: string
  totalAmount: number
  employeeCount: number
  txSignature: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
}

interface PayrollContextType {
  employees: Employee[]
  payrollHistory: PayrollRun[]
  addEmployee: (employee: Omit<Employee, 'id' | 'addedAt'>) => void
  removeEmployee: (id: string) => void
  addPayrollRun: (run: Omit<PayrollRun, 'id'>) => void
}

const PayrollContext = createContext<PayrollContextType | null>(null)

const MOCK_EMPLOYEES: Employee[] = [
  {
    id: '1',
    name: 'Alice Chen',
    walletAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    salary: 8000,
    department: 'Engineering',
    addedAt: '2026-03-01',
  },
  {
    id: '2',
    name: 'Bob Martinez',
    walletAddress: '3yZe8pYj3GH1dF9kQnVmW2rS5tU7vX6aB4cD8eR1qP0',
    salary: 6500,
    department: 'Design',
    addedAt: '2026-03-15',
  },
  {
    id: '3',
    name: 'Carol Kim',
    walletAddress: '9mN2oP4qR6sT8uV0wX1yZ3aB5cD7eF9gH1iJ3kL5mN7',
    salary: 7200,
    department: 'Marketing',
    addedAt: '2026-04-01',
  },
]

const MOCK_HISTORY: PayrollRun[] = [
  {
    id: '1',
    date: '2026-04-18',
    totalAmount: 21700,
    employeeCount: 3,
    txSignature: '4xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU2yZe8pYj3GH1dF9kQnV',
    status: 'completed',
  },
  {
    id: '2',
    date: '2026-03-18',
    totalAmount: 21700,
    employeeCount: 3,
    txSignature: '7mN2oP4qR6sT8uV0wX1yZ3aB5cD7eF9gH1iJ3kL5mN7oP4qR6sT8uV0wX1yZ3a',
    status: 'completed',
  },
]

export function PayrollProvider({ children }: { children: ReactNode }) {
  const [employees, setEmployees] = useState<Employee[]>(MOCK_EMPLOYEES)
  const [payrollHistory, setPayrollHistory] = useState<PayrollRun[]>(MOCK_HISTORY)

  const addEmployee = (emp: Omit<Employee, 'id' | 'addedAt'>) => {
    const newEmployee: Employee = {
      ...emp,
      id: Date.now().toString(),
      addedAt: new Date().toISOString().split('T')[0],
    }
    setEmployees(prev => [...prev, newEmployee])
  }

  const removeEmployee = (id: string) => {
    setEmployees(prev => prev.filter(e => e.id !== id))
  }

  const addPayrollRun = (run: Omit<PayrollRun, 'id'>) => {
    const newRun: PayrollRun = {
      ...run,
      id: Date.now().toString(),
    }
    setPayrollHistory(prev => [newRun, ...prev])
  }

  return (
    <PayrollContext.Provider value={{ employees, payrollHistory, addEmployee, removeEmployee, addPayrollRun }}>
      {children}
    </PayrollContext.Provider>
  )
}

export function usePayroll() {
  const ctx = useContext(PayrollContext)
  if (!ctx) throw new Error('usePayroll must be used within PayrollProvider')
  return ctx
}
