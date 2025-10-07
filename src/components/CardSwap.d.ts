import { FC, ReactNode, ComponentProps } from 'react';

interface CardProps extends ComponentProps<'div'> {
  customClass?: string;
}

export const Card: FC<CardProps>;

interface CardSwapProps {
  width?: number;
  height?: number;
  cardDistance?: number;
  verticalDistance?: number;
  delay?: number;
  pauseOnHover?: boolean;
  onCardClick?: (index: number) => void;
  skewAmount?: number;
  easing?: 'elastic' | 'power1';
  children: ReactNode;
}

declare const CardSwap: FC<CardSwapProps>;

export default CardSwap;
