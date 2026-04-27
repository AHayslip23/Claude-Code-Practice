import React from 'react'

type VerticalCenterProps = {
  children?: React.ReactNode
  className?: string
  fullViewport?: boolean
  style?: React.CSSProperties
}

export default function VerticalCenter({
  children,
  className = '',
  fullViewport = false,
  style,
}: VerticalCenterProps) {
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    ...(fullViewport ? { minHeight: '100vh' } : {}),
    ...style,
  }

  return (
    <div className={className} style={containerStyle}>
      {children}
    </div>
  )
}
