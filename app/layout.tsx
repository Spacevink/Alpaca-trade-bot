import type { Metadata } from 'next'
import './globals.css'
export const metadata: Metadata = { title: 'Options Agent Dashboard', description: 'Bull put spread bot' }
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body>{children}</body></html>)
}