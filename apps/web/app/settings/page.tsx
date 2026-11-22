import type { Metadata } from 'next'
import { SettingsForm } from './_components/SettingsForm'

export const metadata: Metadata = { title: 'Settings' }

export default function SettingsPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <h1 className="mb-6 text-page-title">Settings</h1>
      <SettingsForm />
    </main>
  )
}
