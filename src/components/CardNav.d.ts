import { FC } from 'react';

interface NavLink {
  label: string;
  href: string;
  ariaLabel?: string;
}

interface NavItem {
  label: string;
  bgColor?: string;
  textColor?: string;
  links?: NavLink[];
}

interface CardNavProps {
  logo: string;
  logoAlt?: string;
  items?: NavItem[];
  className?: string;
  ease?: string;
  baseColor?: string;
  menuColor?: string;
  buttonBgColor?: string;
  buttonTextColor?: string;
}

declare const CardNav: FC<CardNavProps>;

export default CardNav;
