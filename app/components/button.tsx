import react from "react"
import Link from "next/link"
const buttonCustom = ({ text, href, varient = "ghost" }) => {
  return (
    <Link href={href}>
      <button className={'btn border-solid bg-yellow-400 text-black-800 rounded-xl  btn-&{varient}'}>
        {text}
      </button>
    </Link >


  )
}
export default buttonCustom 
