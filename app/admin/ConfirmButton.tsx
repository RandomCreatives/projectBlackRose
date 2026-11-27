"use client";

import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  message: string;
};

/** Submit button that asks for confirmation before running a destructive server action. */
export default function ConfirmButton({ message, onClick, children, ...rest }: Props) {
  return (
    <button
      {...rest}
      type="submit"
      onClick={(e) => {
        if (!window.confirm(message)) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      }}
    >
      {children}
    </button>
  );
}
