import React from 'react';
import { render, screen } from '@testing-library/react';
import { CatLoading } from '../components/common/CatLoading';

// Mock the ThemeContext
jest.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({
    isDarkMode: false
  })
}));

describe('CatLoading Component', () => {
  it('renders with default message', () => {
    render(<CatLoading />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders with custom message', () => {
    render(<CatLoading message="Initializing LINE LIFF..." />);
    expect(screen.getByText('Initializing LINE LIFF...')).toBeInTheDocument();
  });

  it('renders cat GIF in light mode', () => {
    render(<CatLoading />);
    const catImage = screen.getByAltText('Cute cat loading animation');
    expect(catImage).toBeInTheDocument();
    expect(catImage).toHaveAttribute('src', '/animations/cat-licking-light.gif');
  });

  it('renders cat GIF in dark mode', () => {
    // Mock dark mode
    jest.doMock('../contexts/ThemeContext', () => ({
      useTheme: () => ({
        isDarkMode: true
      })
    }));

    render(<CatLoading />);
    const catImage = screen.getByAltText('Cute cat loading animation');
    expect(catImage).toBeInTheDocument();
    expect(catImage).toHaveAttribute('src', '/animations/cat-licking-dark.gif');
  });

  it('renders without cat when showCat is false', () => {
    render(<CatLoading showCat={false} />);
    expect(screen.queryByAltText('Cute cat loading animation')).not.toBeInTheDocument();
  });

  it('applies correct size classes', () => {
    render(<CatLoading size="lg" />);
    const catImage = screen.getByAltText('Cute cat loading animation');
    expect(catImage).toHaveClass('h-32', 'w-32');
  });
});
