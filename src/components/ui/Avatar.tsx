import Image from 'next/image'

type Props = {
  src: string | null | undefined
  alt: string
  className?: string
}

export default function Avatar({ src, alt, className = 'h-8 w-8 rounded-full' }: Props) {
  if (src) {
    return <img src={src} alt={alt} className={`${className} object-cover`} />
  }
  return (
    <span className={`${className} flex items-center justify-center bg-gray-800`}>
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-[60%] w-[60%] text-gray-500">
        <path d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0 2.25c-5.006 0-7.5 2.494-7.5 3.75v.75h15v-.75c0-1.256-2.494-3.75-7.5-3.75Z" />
      </svg>
    </span>
  )
}
