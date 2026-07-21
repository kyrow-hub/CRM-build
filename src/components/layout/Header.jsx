import HeaderClientSearch from './HeaderClientSearch.jsx'

export default function Header({ title, subtitle }) {
  return (
    <header className="header-bar">
      <div>
        <h1 className="header-title">{title}</h1>
        {subtitle && <div className="header-subtitle">{subtitle}</div>}
      </div>

      <div className="header-actions">
        <HeaderClientSearch />
        <div className="header-avatar">JD</div>
      </div>
    </header>
  )
}
