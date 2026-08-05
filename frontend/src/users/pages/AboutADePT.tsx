import {
    Code2,
    LayoutDashboard,
    ServerCog,
    Database,
    Rocket,
    PackageOpen,
    Users,
    Mail,
} from 'lucide-react';

import '../styles/AboutADePT.css';

// lucide-react 1.0 dropped all brand icons (GitHub included), so the
// GitHub mark is a small local SVG sized to match the lucide icon set.
function GithubIcon({ size = 15 }: { size?: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
        >
            <path d="M12 .5C5.73.5.75 5.48.75 11.75c0 5.02 3.26 9.28 7.78 10.78.57.1.78-.25.78-.55 0-.27-.01-1.16-.02-2.1-3.17.69-3.84-1.35-3.84-1.35-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.75 1.18 1.75 1.18 1.02 1.75 2.68 1.25 3.33.95.1-.74.4-1.25.72-1.53-2.53-.29-5.19-1.27-5.19-5.63 0-1.24.44-2.26 1.17-3.06-.12-.29-.51-1.45.11-3.02 0 0 .96-.31 3.14 1.17a10.9 10.9 0 0 1 2.86-.39c.97 0 1.95.13 2.86.39 2.18-1.48 3.14-1.17 3.14-1.17.62 1.57.23 2.73.11 3.02.73.8 1.17 1.82 1.17 3.06 0 4.37-2.66 5.34-5.2 5.62.41.36.77 1.06.77 2.14 0 1.55-.01 2.79-.01 3.17 0 .3.2.66.79.55A11.26 11.26 0 0 0 23.25 11.75C23.25 5.48 18.27.5 12 .5Z" />
        </svg>
    );
}

import jadePhoto from '../assets/team/jade.png';
import melissaPhoto from '../assets/team/mels.png';
import novaPhoto from '../assets/team/nov.png';
import cheannPhoto from '../assets/team/che.png';
import sheilaPhoto from '../assets/team/shei.png';

// --- CONTENT: SYSTEM OVERVIEW -------------------------------------------
const OVERVIEW = {
    lead:
        "ADePT (Assessor Document Processing and Tracking System) is a comprehensive web-based information system developed to modernize and streamline the document processing operations of the Provincial Assessor's Office in the Province of Zamboanga del Norte. Designed to replace time-consuming manual procedures, the platform centralizes document request management into a secure, organized, and efficient digital environment, enabling personnel to process transactions with greater speed, accuracy, and accountability.",
    workflow:
        "The system provides an integrated workflow that supports the complete lifecycle of assessor-related documents. From request entry and document processing to payment verification, transaction management, and administrative oversight, ADePT ensures that every transaction is properly recorded, monitored, and managed through a unified platform. Built-in reporting and analytics further empower personnel with valuable operational insights that support informed decision-making and improve service delivery throughout the Province of Zamboanga del Norte.",
    commitment:
        "Developed using modern web technologies and a scalable system architecture, ADePT emphasizes usability, reliability, data integrity, and maintainability. Its intuitive interface, secure backend infrastructure, optimized database design, and comprehensive administrative controls work together to enhance productivity while reducing processing time and minimizing human error. As a digital solution tailored to the operational needs of the Provincial Assessor's Office, ADePT demonstrates a commitment to advancing e-governance by promoting efficient, transparent, and citizen-centered public service through innovative digital transformation.",
    documentTypes: ['Tax Declarations', 'Certificate of Land Holding', 'Certificate of No Landholding'],
};

// --- CONTENT: THE ARCHITECTS -------------------------------------------
const ARCHITECTS = [
    {
        code: 'FE · LEAD',
        accent: 'primary',
        name: 'Jade Kyll M. Tecson',
        role: 'Lead Front-End Developer',
        description:
            "Led the development of ADePT's modern and responsive user interface, delivering intuitive workflows that simplify government document processing. Built scalable frontend components, interactive dashboards, and efficient request modules while collaborating with the backend team to ensure seamless integration, optimal performance, and a consistent user experience across the entire system.",
        photo: jadePhoto,
        github: 'https://github.com/codexkyll',
        email: 'jadekyllmagallontecson@gmail.com',
    },
    {
        code: 'BE · LEAD',
        accent: 'teal',
        name: 'Melissa Oria',
        role: 'Lead Back-End Developer',
        description:
            "Led the development of ADePT's backend architecture by implementing the core business logic, secure APIs, and server-side functionalities that power the system's document processing workflow. Developed features for request validation, document generation, transaction processing, and data synchronization between the frontend and database, ensuring secure, reliable, and efficient operations across the Provincial Assessor's Office.",
        photo: melissaPhoto,
        github: 'https://github.com/0xMeyls',
        email: 'meylsoria@gmail.com',
    },
    {
        code: 'FS · 01',
        accent: 'gold',
        name: 'Nova Grace B. Enojo',
        role: 'Full-Stack Developer',
        description:
            "Specialized in the development of ADePT's Administrator Module, delivering both frontend and backend functionalities that support system administration and management. Implemented administrative controls for user account management, system configuration, transaction oversight, and reports while ensuring secure access, seamless integration, and efficient coordination with the platform's core document processing and tracking workflows.",
        photo: novaPhoto,
        github: 'https://github.com/ssusupernova',
        email: 'enojonovagrace@gmail.com',
    },
    {
        code: 'DBA · 01',
        accent: 'red',
        name: 'Che Ann P. Abal',
        role: 'Database Architect and Deployment Engineer',
        description:
            "Designed and optimized ADePT's database architecture to securely manage property records, request transactions, and system-generated documents with accuracy and efficiency. Configured deployment environments, optimized database performance, and implemented backup and recovery strategies to ensure data integrity, system reliability, and stable production deployment for continuous government operations.",
        photo: cheannPhoto,
        github: 'https://github.com/chxxxanndev',
        email: 'abalcheannplaza@gmail.com',
    },
    {
        code: 'FE · DOC',
        accent: 'green',
        name: 'Sheila Mae A. Lagpac',
        role: 'Front-End Developer and Documentation Lead',
        description:
            "Developed responsive user interface components that enhance usability, accessibility, and consistency across ADePT's document request, processing, and transaction modules. Led the preparation of comprehensive technical documentation, user manuals, workflow guides, and system references, ensuring effective knowledge transfer, simplified user adoption, and long-term maintainability of the platform.",
        photo: sheilaPhoto,
        github: 'https://github.com/shxaberry',
        email: 'sheilamai32@gmail.com',
    },
] as const;

// --- CONTENT: TECHNOLOGY INFRASTRUCTURE --------------------------------
const STACK = [
    {
        icon: Code2,
        title: 'Programming Languages',
        subtitle: 'TypeScript / JavaScript',
        description:
            'Forging a type-safe, error-resilient foundation that guarantees code integrity across the entire application ecosystem.',
        span: 'wide',
    },
    {
        icon: LayoutDashboard,
        title: 'Frontend',
        subtitle: 'React',
        description:
            'Driving a highly reactive, scalable user interface designed to streamline complex administrative workflows.',
        span: 'narrow',
    },
    {
        icon: ServerCog,
        title: 'Backend',
        subtitle: 'Node.js / Express.js',
        description:
            'Engineering the high-throughput processing engine that securely handles system logic, authentication, and data routing.',
        span: 'narrow',
    },
    {
        icon: Database,
        title: 'Database',
        subtitle: 'Supabase / PostgreSQL',
        description:
            'Fortifying vital assessment records within a rigid, highly relational, and secure data infrastructure.',
        span: 'wide',
    },
    {
        icon: Rocket,
        title: 'Deployment Platform',
        subtitle: 'Vercel',
        description:
            'Orchestrating continuous, edge-optimized delivery to guarantee zero-downtime reliability and rapid scalability.',
        span: 'narrow',
    },
    {
        icon: PackageOpen,
        title: 'Libraries',
        subtitle: 'Axios, Recharts, PDF Renderer, etc.',
        description:
            'Powering advanced capabilities, from secure API communications and precise data visualization to the dynamic generation of official documents.',
        span: 'narrow',
    },
] as const;

const COLLAB = {
    icon: Users,
    title: 'Development & Collaboration',
    subtitle: 'Figma, GitHub, Miro',
    description:
        'Commanding the project lifecycle\u2014from strategic blueprinting and pixel-perfect prototyping to stringent version control.',
};

export function AboutADePT({ onNavigateToDashboard }: { onNavigateToDashboard?: () => void }) {
    return (
        <div className="aa-page page-transition">
            {/* Breadcrumb — Dashboard > About ADePT */}
            <nav className="aa-breadcrumb" aria-label="Breadcrumb">
                <button
                    type="button"
                    className="aa-breadcrumb-item--link"
                    onClick={onNavigateToDashboard}
                >
                    Dashboard
                </button>
                <span className="aa-breadcrumb-sep">&gt;</span>
                <span className="aa-breadcrumb-item--current">About ADePT</span>
            </nav>

            {/* --- HERO --- */}
            <div className="aa-hero">
                <span className="aa-hero-eyebrow">System Architecture &amp; Development Team</span>
                <h1 className="aa-hero-title">ADePT Architecture &amp; Engineering Command</h1>
                <p className="aa-hero-subtitle">
                    The personnel and infrastructure behind the Assessor Document Processing and Tracking System.
                </p>
            </div>

            {/* --- SECTION A: SYSTEM OVERVIEW --- */}
            <section className="aa-section">
                <div className="aa-section-header">
                    <span className="aa-section-label">Section A</span>
                    <h2 className="aa-section-title">System Overview</h2>
                </div>

                <div className="aa-overview">
                    <span className="aa-overview-mark" aria-hidden="true">&ldquo;</span>

                    <p className="aa-overview-lead">{OVERVIEW.lead}</p>

                    <div className="aa-overview-grid">
                        <p>{OVERVIEW.workflow}</p>
                        <p>{OVERVIEW.commitment}</p>
                    </div>

                    <div className="aa-overview-doctypes">
                        <span className="aa-overview-doctypes-label">Document Types Supported</span>
                        <div className="aa-doctype-chips">
                            {OVERVIEW.documentTypes.map((doc) => (
                                <span key={doc} className="aa-doctype-chip">{doc}</span>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* --- SECTION B: THE ARCHITECTS --- */}
            <section className="aa-section">
                <div className="aa-section-header">
                    <span className="aa-section-label">Section B</span>
                    <h2 className="aa-section-title">The Architects</h2>
                </div>

                <div className="aa-team-list">
                    {ARCHITECTS.map((person, i) => (
                        <div key={person.name} className="aa-team-item">
                            <span className="aa-team-decor aa-team-decor--ring" aria-hidden="true" />
                            <span className="aa-team-decor aa-team-decor--ring-sm" aria-hidden="true" />
                            <span className="aa-team-decor aa-team-decor--fill" aria-hidden="true" />

                            <article
                                className={`aa-team-row aa-accent-${person.accent} ${i % 2 === 1 ? 'aa-team-row--reverse' : ''}`}
                            >
                                <div className="aa-team-photo-wrap">
                                    <span className="aa-team-code aa-team-code--float">{person.code}</span>
                                    <img
                                        src={person.photo}
                                        alt={person.name}
                                        className="aa-team-photo"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                            (e.target as HTMLImageElement).parentElement?.classList.add('aa-photo-fallback');
                                        }}
                                    />
                                    <span className="aa-team-photo-initials">
                                        {person.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                                    </span>
                                </div>

                                <div className="aa-team-info">
                                    <h3 className="aa-team-name">{person.name}</h3>
                                    <span className="aa-team-role">{person.role}</span>
                                    <p className="aa-team-desc">{person.description}</p>

                                    <div className="aa-team-links">
                                        <a
                                            href={person.github}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="aa-team-link"
                                            aria-label={`${person.name}'s GitHub profile`}
                                        >
                                            <GithubIcon size={15} />
                                            <span>GitHub</span>
                                        </a>
                                        <a
                                            href={`mailto:${person.email}`}
                                            className="aa-team-link"
                                            aria-label={`Email ${person.name}`}
                                        >
                                            <Mail size={15} strokeWidth={2} />
                                            <span>{person.email}</span>
                                        </a>
                                    </div>
                                </div>
                            </article>
                        </div>
                    ))}
                </div>
            </section>

            {/* --- SECTION C: TECHNOLOGY INFRASTRUCTURE --- */}
            <section className="aa-section">
                <div className="aa-section-header">
                    <span className="aa-section-label">Section C</span>
                    <h2 className="aa-section-title">Technology Infrastructure</h2>
                </div>

                <div className="aa-stack-grid">
                    {STACK.map(({ icon: Icon, title, subtitle, description, span }) => (
                        <div key={title} className={`aa-stack-tile aa-stack-tile--${span}`}>
                            <div className="aa-stack-icon">
                                <Icon size={20} strokeWidth={2} />
                            </div>
                            <h3 className="aa-stack-title">{title}</h3>
                            <span className="aa-stack-subtitle">{subtitle}</span>
                            <p className="aa-stack-desc">{description}</p>
                        </div>
                    ))}

                    <div className="aa-stack-tile aa-stack-tile--full">
                        <div className="aa-stack-icon">
                            <COLLAB.icon size={20} strokeWidth={2} />
                        </div>
                        <div className="aa-stack-full-text">
                            <h3 className="aa-stack-title">{COLLAB.title}</h3>
                            <span className="aa-stack-subtitle">{COLLAB.subtitle}</span>
                            <p className="aa-stack-desc">{COLLAB.description}</p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}