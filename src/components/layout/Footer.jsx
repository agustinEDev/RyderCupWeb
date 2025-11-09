import React from 'react';

const Footer = () => {
  return (
    <footer className="flex justify-center">
      <div className="flex max-w-[960px] flex-1 flex-col">
        <div className="flex flex-col gap-6 px-5 py-10 text-center">
          <div className="flex flex-wrap items-center justify-center gap-6 md:flex-row md:justify-around">
            <a className="text-gray-500 text-base font-normal leading-normal min-w-40 hover:text-gray-700 transition-colors" href="#terms">
              Terms of Service
            </a>
            <a className="text-gray-500 text-base font-normal leading-normal min-w-40 hover:text-gray-700 transition-colors" href="#privacy">
              Privacy Policy
            </a>
            <a className="text-gray-500 text-base font-normal leading-normal min-w-40 hover:text-gray-700 transition-colors" href="#contact">
              Contact Us
            </a>
          </div>
          <p className="text-gray-500 text-base font-normal leading-normal">
            © 2024 Ryder Cup Amateur Manager. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
