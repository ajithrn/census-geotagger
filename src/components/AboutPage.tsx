import { Mail, Code2, ExternalLink, Shield, Scale, Info } from 'lucide-react';

export function AboutPage() {
  return (
    <div className="h-full overflow-y-auto p-5 pb-20 bg-white">
      {/* App Info */}
      <div className="flex items-center gap-3 mb-4">
        <img src="/favicon.svg" alt="" className="w-14 h-14 rounded-xl ring-1 ring-gray-200" />
        <div>
          <h2 className="text-lg font-bold text-gray-800">Census GeoTagger</h2>
          <p className="text-xs text-gray-500">Field Survey & Geolocation Logger</p>
          <p className="text-[10px] text-gray-400 font-mono mt-0.5">Version 1.5.0</p>
        </div>
      </div>

      <p className="text-sm text-gray-600 leading-relaxed mb-8">
        An offline-first progressive web app for conducting household census surveys
        with GPS geolocation tagging. Designed for field workers who need a reliable
        tool that works without internet connectivity.
      </p>

      {/* Developer & Support */}
      <Section icon={<Info size={15} />} title="Developer">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-800">Ajith R N</p>
            <p className="text-xs text-gray-500">ajithrn.com</p>
          </div>
          <a
            href="https://ajithrn.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-gray-600"
          >
            <ExternalLink size={14} />
          </a>
        </div>
        <div className="flex items-center gap-4 mt-3">
          <a
            href="https://buymeacoffee.com/ajithrn"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            <img src="/assets/bmc-logo-no-background.png" alt="" className="h-4 w-4 object-contain" />
            Buy Me a Coffee
          </a>
          <a
            href="mailto:dev@ajithrn.com"
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            <Mail size={13} /> dev@ajithrn.com
          </a>
        </div>
      </Section>

      {/* Privacy & Data */}
      <Section icon={<Shield size={15} />} title="Privacy & Data">
        <div className="space-y-2 text-xs text-gray-600 leading-relaxed">
          <p>
            All survey data is stored <strong>exclusively on your device</strong> using
            the browser's IndexedDB. No data is transmitted to any server, cloud service,
            or third party at any time.
          </p>
          <p>
            GPS coordinates are captured only when you explicitly tap the location button.
            Location data is stored locally alongside your survey records and is never
            shared automatically.
          </p>
          <p>
            Exported files (CSV, GeoJSON, PDF) are generated entirely on your device.
            The developer has no access to any data you collect or export.
          </p>
        </div>
      </Section>

      {/* Disclaimer */}
      <Section icon={<Scale size={15} />} title="Disclaimer">
        <div className="space-y-2 text-xs text-gray-600 leading-relaxed">
          <p>
            This application is provided <strong>"as is"</strong> without warranty of any kind,
            express or implied. The developer assumes no responsibility for the accuracy,
            completeness, or reliability of data collected using this tool.
          </p>
          <p>
            The user is solely responsible for:
          </p>
          <ul className="list-disc list-inside space-y-1 text-gray-600 ml-1">
            <li>Obtaining proper consent from survey respondents</li>
            <li>Compliance with applicable data protection and privacy laws</li>
            <li>The accuracy and lawful use of collected data</li>
            <li>Secure handling and storage of exported data files</li>
            <li>Any consequences arising from the use or misuse of this tool</li>
          </ul>
          <p>
            The developer shall not be held liable for any damages, claims, or legal
            actions arising from the use of this application, including but not limited
            to data loss, privacy violations, or misuse of collected information.
          </p>
          <p>
            By using this application, you acknowledge and agree to these terms.
          </p>
        </div>
      </Section>

      {/* Terms of Use */}
      <Section icon={<Scale size={15} />} title="Terms of Use">
        <div className="space-y-2 text-xs text-gray-600 leading-relaxed">
          <p>
            This tool is intended for legitimate census and survey data collection
            purposes only. Users must ensure they have proper authorization to conduct
            surveys in their designated areas.
          </p>
          <p>
            You agree not to use this application to:
          </p>
          <ul className="list-disc list-inside space-y-1 text-gray-600 ml-1">
            <li>Collect data without informed consent of respondents</li>
            <li>Violate any person's right to privacy</li>
            <li>Engage in surveillance or tracking without authorization</li>
            <li>Misrepresent yourself or the purpose of data collection</li>
          </ul>
        </div>
      </Section>

      {/* Source & License */}
      <Section icon={<Code2 size={15} />} title="Open Source">
        <div className="space-y-2">
          <a
            href="https://github.com/ajithrn/census-geotagger"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-slate-700 hover:text-slate-900"
          >
            <Code2 size={15} /> GitHub Repository
            <ExternalLink size={12} className="text-gray-400" />
          </a>
          <p className="text-xs text-gray-500">
            Licensed under the MIT License. Map data &copy; OpenStreetMap contributors.
          </p>
        </div>
      </Section>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 pb-6 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-gray-500">{icon}</span>
        <h3 className="text-sm font-bold text-gray-700">{title}</h3>
      </div>
      {children}
    </div>
  );
}
