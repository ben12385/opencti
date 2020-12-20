// eslint-disable-next-line
export const resolveLink = (type) => {
  switch (type) {
    case 'Attack-Pattern':
      return '/dashboard/arsenal/attack_patterns';
    case 'Campaign':
      return '/dashboard/threats/campaigns';
    case 'Note':
      return '/dashboard/analysis/notes';
    case 'Observed-Data':
      return '/dashboard/events/observed_data';
    case 'Opinion':
      return '/dashboard/analysis/opinions';
    case 'Report':
      return '/dashboard/analysis/reports';
    case 'Course-Of-Action':
      return '/dashboard/arsenal/courses_of_action';
    case 'Individual':
      return '/dashboard/entities/individuals';
    case 'Organization':
      return '/dashboard/entities/organizations';
    case 'Sector':
      return '/dashboard/entities/sectors';
    case 'Indicator':
      return '/dashboard/observations/indicators';
    case 'Infrastructure':
      return '/dashboard/observations/infrastructures';
    case 'Intrusion-Set':
      return '/dashboard/threats/intrusion_sets';
    case 'City':
      return '/dashboard/entities/cities';
    case 'Country':
      return '/dashboard/entities/countries';
    case 'Region':
      return '/dashboard/entities/regions';
    case 'Position':
      return '/dashboard/entities/positions';
    case 'Malware':
      return '/dashboard/arsenal/malwares';
    case 'Threat-Actor':
      return '/dashboard/threats/threat_actors';
    case 'Tool':
      return '/dashboard/arsenal/tools';
    case 'Vulnerability':
      return '/dashboard/arsenal/vulnerabilities';
    case 'X-OpenCTI-Incident':
      return '/dashboard/events/incidents';
    case 'Stix-Cyber-Observable':
    case 'Autonomous-System':
    case 'Directory':
    case 'Domain-Name':
    case 'Email-Addr':
    case 'Email-Message':
    case 'Email-Mime-Part-Type':
    case 'Artifact':
    case 'StixFile':
    case 'X509-Certificate':
    case 'IPv4-Addr':
    case 'IPv6-Addr':
    case 'Mac-Addr':
    case 'Mutex':
    case 'Network-Traffic':
    case 'Process':
    case 'Software':
    case 'Url':
    case 'User-Account':
    case 'Windows-Registry-Key':
    case 'Windows-Registry-Value-Type':
    case 'X509-V3-Extensions-Type':
    case 'X-OpenCTI-Cryptographic-Key':
    case 'X-OpenCTI-Cryptocurrency-Wallet':
    case 'X-OpenCTI-Hostname':
    case 'X-OpenCTI-Text':
    case 'X-OpenCTI-User-Agent':
      return '/dashboard/observations/observables';
    default:
      return null;
  }
};
