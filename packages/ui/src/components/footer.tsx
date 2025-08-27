import React from 'react'

interface FooterLink {
  href: string
  label: string
  onClick?: () => void
}

interface FooterSection {
  title: string
  links: FooterLink[]
}

interface FooterProps {
  logoText?: string
  logoHref?: string
  description?: string
  sections?: FooterSection[]
  copyright?: string
  className?: string
}

export function Footer({
  logoText = "♾️ Infinity Game",
  logoHref = "/",
  description = "The ultimate multiplayer gaming platform. Play with friends, create memories, and enjoy seamless gaming experiences.",
  sections = [
    {
      title: "Quick Links",
      links: [
        { href: "/lobbies", label: "Browse Lobbies" },
        { href: "/auth/register", label: "Sign Up" },
        { href: "/auth/login", label: "Login" }
      ]
    },
    {
      title: "Support",
      links: [
        { href: "#", label: "Help Center" },
        { href: "#", label: "Contact Us" },
        { href: "#", label: "Privacy Policy" }
      ]
    }
  ],
  copyright = "© 2024 Infinity Game. All rights reserved.",
  className = ""
}: FooterProps) {
  return (
    <footer className={`bg-gray-900 text-white py-12 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <a href={logoHref}>
              <h3 className="text-2xl font-bold mb-4">{logoText}</h3>
            </a>
            <p className="text-gray-400 mb-4">
              {description}
            </p>
          </div>
          
          {sections.map((section, index) => (
            <div key={index}>
              <h4 className="text-lg font-semibold mb-4">{section.title}</h4>
              <ul className="space-y-2 text-gray-400">
                {section.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    {link.onClick ? (
                      <button 
                        onClick={link.onClick}
                        className="hover:text-white transition-colors"
                      >
                        {link.label}
                      </button>
                    ) : (
                      <a 
                        href={link.href} 
                        className="hover:text-white transition-colors"
                      >
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>{copyright}</p>
        </div>
      </div>
    </footer>
  )
}
