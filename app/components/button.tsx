import React from "react";
import Link from "next/link";

type ButtonCustomProps = {
  text: string;
  href: string;
  variant?: "ghost" | "primary" | "secondary";
};

const ButtonCustom: React.FC<ButtonCustomProps> = ({
  text,
  href,
  variant = "ghost",
}) => {
  return (
    <Link href={href}>
      <button
        className={`btn border-solid bg-yellow-400 text-black rounded-xl btn-${variant}`}
      >
        {text}
      </button>
    </Link>
  );
};

export default ButtonCustom;
