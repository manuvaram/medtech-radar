export const metadata = {
  title: 'MedTech Radar',
  description: 'Daily MedTech market intelligence',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="MedTech Radar" />
        <meta name="theme-color" content="#111111" />
      </head>
      <body style={{ margin: 0, background: '#f5f5f3' }}>{children}</body>
    </html>
  )
}
