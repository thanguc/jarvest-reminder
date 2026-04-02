import logoSrc from '../assets/logo.png'

export default function Logo({ size = 20 }: { size?: number }): JSX.Element {
  return (
    <img
      src={logoSrc}
      alt="Jarvest Timer"
      width={size}
      height={size}
      style={{ borderRadius: size * 0.1875 }}
    />
  )
}
