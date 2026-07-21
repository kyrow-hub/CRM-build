export default function Card({ children, style, className = '', ...props }) {
  return (
    <div className={`card ${className}`.trim()} style={style} {...props}>
      {children}
    </div>
  )
}
