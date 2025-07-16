
import React from "react";
import { Link } from "react-router-dom";

const Footer = React.memo(() => {
  return (
    <footer className="border-t border-zinc-800 bg-zinc-900 py-6">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-medium text-white mb-3">ASO Tool</h3>
            <p className="text-zinc-400 text-sm">
              App Store Optimization platform by YodelMobile
            </p>
          </div>
          
          <div>
            <h3 className="font-medium text-white mb-3">Product</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/features" className="text-zinc-400 hover:text-white text-sm transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-zinc-400 hover:text-white text-sm transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link to="/changelog" className="text-zinc-400 hover:text-white text-sm transition-colors">
                  Changelog
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-medium text-white mb-3">Resources</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/docs" className="text-zinc-400 hover:text-white text-sm transition-colors">
                  Documentation
                </Link>
              </li>
              <li>
                <Link to="/api" className="text-zinc-400 hover:text-white text-sm transition-colors">
                  API
                </Link>
              </li>
              <li>
                <Link to="/blog" className="text-zinc-400 hover:text-white text-sm transition-colors">
                  Blog
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-medium text-white mb-3">Company</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/about" className="text-zinc-400 hover:text-white text-sm transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-zinc-400 hover:text-white text-sm transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link to="/legal" className="text-zinc-400 hover:text-white text-sm transition-colors">
                  Legal
                </Link>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="mt-8 pt-6 border-t border-zinc-800 flex flex-col md:flex-row items-center justify-between">
          <p className="text-zinc-400 text-sm">
            © {new Date().getFullYear()} YodelMobile. All rights reserved.
          </p>
          
          <div className="flex items-center space-x-4 mt-4 md:mt-0">
            <Link to="/privacy" className="text-zinc-400 hover:text-white text-sm transition-colors">
              Privacy
            </Link>
            <Link to="/terms" className="text-zinc-400 hover:text-white text-sm transition-colors">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = "Footer";

export default Footer;
