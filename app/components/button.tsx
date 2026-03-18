import React from "react";
import Link from "next/link";

type ButtonCustomProps = {
  text: string;
  href: string;
  varient?: "ghost" | "primary" | "secondary"; // adjust as per your design system
};

const ButtonCustom: React.FC<ButtonCustomProps> = ({
  text,
  href,
  varient = "ghost",
}) => {
  return (
    <Link href={href}>
      <button
        className={`btn border-solid bg-yellow-400 text-black rounded-xl btn-${varient}`}
      >
        {text}
      </button>
    </Link>
  );
};

export default ButtonCustom;
