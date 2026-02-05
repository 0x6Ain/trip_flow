import type {
  ButtonHTMLAttributes,
  AnchorHTMLAttributes,
  ReactNode,
} from "react";
import { Link } from "react-router-dom";

interface BaseGradientButtonProps {
  variant?: "primary" | "secondary";
  size?: "sm" | "md" | "lg";
}

interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">,
    BaseGradientButtonProps {
  children: ReactNode;
  as?: "button";
  to?: never;
}

interface LinkProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "children">,
    BaseGradientButtonProps {
  children: ReactNode;
  as: "link";
  to: string;
}

type GradientButtonProps = ButtonProps | LinkProps;

export const GradientButton = ({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: GradientButtonProps) => {
  const baseStyles =
    "bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold transition-all inline-flex items-center justify-center";

  const sizeStyles = {
    sm: "px-3 py-1.5 text-sm rounded-lg",
    md: "px-4 py-2 text-base rounded-xl",
    lg: "px-6 py-3 text-lg rounded-xl",
  };

  const shadowStyles =
    "shadow-[0_4px_12px_rgba(59,130,246,0.27)] hover:shadow-[0_4px_16px_rgba(59,130,246,0.4)]";

  const variantStyles = {
    primary: "bg-gradient-to-r from-blue-500 to-purple-500",
    secondary: "bg-gradient-to-r from-purple-500 to-pink-500",
  };

  const disabledStyles =
    "disabled" in props && props.disabled
      ? "opacity-50 cursor-not-allowed"
      : "";

  const combinedClassName = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${shadowStyles} ${disabledStyles} ${className}`;

  if (props.as === "link" && "to" in props) {
    const { as, to, ...linkProps } = props;
    return (
      <Link to={to} className={combinedClassName} {...linkProps}>
        {children}
      </Link>
    );
  }

  const { as, to, ...buttonProps } = props as ButtonProps;
  return (
    <button className={combinedClassName} {...buttonProps}>
      {children}
    </button>
  );
};
