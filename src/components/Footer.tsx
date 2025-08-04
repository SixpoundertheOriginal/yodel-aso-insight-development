
import React from "react";
import { Link } from "react-router-dom";

const Footer = React.memo(() => {
    return (
      <footer className="border-t border-footer-border bg-footer py-6 text-footer-foreground">
        <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="mb-3 font-medium text-nav-text">ASO Tool</h3>
              <p className="text-footer-foreground text-sm">
              App Store Optimization platform by YodelMobile
            </p>
          </div>
          
            <div>
              <h3 className="mb-3 font-medium text-nav-text">Product</h3>
              <ul className="space-y-2">
              <li>
                  <Link to="/features" className="text-nav-text-secondary hover:text-nav-text text-sm transition-colors">
                  Features
                </Link>
              </li>
              <li>
                  <Link to="/pricing" className="text-nav-text-secondary hover:text-nav-text text-sm transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                  <Link to="/changelog" className="text-nav-text-secondary hover:text-nav-text text-sm transition-colors">
                  Changelog
                </Link>
              </li>
            </ul>
          </div>
          
            <div>
              <h3 className="mb-3 font-medium text-nav-text">Resources</h3>
            <ul className="space-y-2">
              <li>
                  <Link to="/docs" className="text-nav-text-secondary hover:text-nav-text text-sm transition-colors">
                  Documentation
                </Link>
              </li>
              <li>
                  <Link to="/api" className="text-nav-text-secondary hover:text-nav-text text-sm transition-colors">
                  API
                </Link>
              </li>
              <li>
                  <Link to="/blog" className="text-nav-text-secondary hover:text-nav-text text-sm transition-colors">
                  Blog
                </Link>
              </li>
            </ul>
          </div>
          
            <div>
              <h3 className="mb-3 font-medium text-nav-text">Company</h3>
            <ul className="space-y-2">
              <li>
                  <Link to="/about" className="text-nav-text-secondary hover:text-nav-text text-sm transition-colors">
                  About
                </Link>
              </li>
              <li>
                  <Link to="/contact" className="text-nav-text-secondary hover:text-nav-text text-sm transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                  <Link to="/legal" className="text-nav-text-secondary hover:text-nav-text text-sm transition-colors">
                  Legal
                </Link>
              </li>
            </ul>
          </div>
        </div>
        
          <div className="mt-8 flex flex-col items-center justify-between border-t border-footer-border pt-6 md:flex-row">
            <p className="text-footer-foreground text-sm">
            © 2025 Yodel Mobile. All rights reserved.
          </p>
          
            <div className="mt-4 flex items-center space-x-4 md:mt-0">
              <Link to="/privacy" className="text-nav-text-secondary hover:text-nav-text text-sm transition-colors">
              Privacy
            </Link>
              <Link to="/terms" className="text-nav-text-secondary hover:text-nav-text text-sm transition-colors">
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
