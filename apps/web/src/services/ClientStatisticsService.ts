import type { ClientRow } from "../pinia/types/clients.types";
import type { ProjectRow } from "../pinia/types/projects.types";
import type { LeadRow } from "../pinia/types/leads.types";

/**
 * Client Statistics Service
 * 
 * Pure functions for calculating client-related statistics.
 * Follows Open-Closed Principle: extensible without modification.
 */

export interface ClientStatistics {
  totalClients: number;
  clientsWithProjects: number;
  clientsWithoutProjects: number;
  averageProjectsPerClient: number;
  topClientsByProjects: Array<{ clientId: string; clientName: string; projectCount: number }>;
  clientsByCompany: Record<string, number>;
  recentlyAdded: number; // Last 30 days
  recentlyUpdated: number; // Last 7 days
}

export interface ClientProjectDistribution {
  clientId: string;
  clientName: string;
  projectCount: number;
  activeProjects: number;
  completedProjects: number;
  blockedProjects: number;
}

export interface ClientTimelineData {
  month: string;
  newClients: number;
  totalClients: number;
}

/**
 * Base statistics calculator interface (Liskov Substitution Principle)
 */
export interface IStatisticsCalculator<TInput, TOutput> {
  calculate(input: TInput): TOutput;
}

/**
 * Client statistics calculator implementation
 */
export class ClientStatisticsCalculator implements IStatisticsCalculator<{
  clients: ClientRow[];
  projects: ProjectRow[];
}, ClientStatistics> {
  calculate(input: { clients: ClientRow[]; projects: ProjectRow[] }): ClientStatistics {
    const { clients, projects } = input;
    
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Count projects per client
    const projectsByClient = new Map<string, number>();
    projects.forEach(p => {
      if (p.clientId) {
        projectsByClient.set(p.clientId, (projectsByClient.get(p.clientId) || 0) + 1);
      }
    });

    // Count clients by company
    const clientsByCompany: Record<string, number> = {};
    clients.forEach(c => {
      const company = c.company || "Sem empresa";
      clientsByCompany[company] = (clientsByCompany[company] || 0) + 1;
    });

    // Top clients by project count
    const topClientsByProjects = Array.from(projectsByClient.entries())
      .map(([clientId, projectCount]) => {
        const client = clients.find(c => c.id === clientId);
        return {
          clientId,
          clientName: client?.name || "Unknown",
          projectCount,
        };
      })
      .sort((a, b) => b.projectCount - a.projectCount)
      .slice(0, 5);

    // Recently added/updated clients
    const recentlyAdded = clients.filter(c => {
      const createdAt = new Date(c.createdAt);
      return createdAt >= thirtyDaysAgo;
    }).length;

    const recentlyUpdated = clients.filter(c => {
      const updatedAt = new Date(c.updatedAt);
      return updatedAt >= sevenDaysAgo;
    }).length;

    const clientsWithProjects = projectsByClient.size;
    const totalProjects = projects.filter(p => p.clientId).length;
    const averageProjectsPerClient = clientsWithProjects > 0 
      ? Math.round((totalProjects / clientsWithProjects) * 10) / 10 
      : 0;

    return {
      totalClients: clients.length,
      clientsWithProjects,
      clientsWithoutProjects: clients.length - clientsWithProjects,
      averageProjectsPerClient,
      topClientsByProjects,
      clientsByCompany,
      recentlyAdded,
      recentlyUpdated,
    };
  }
}

/**
 * Client-Project distribution calculator
 */
export class ClientProjectDistributionCalculator implements IStatisticsCalculator<{
  clients: ClientRow[];
  projects: ProjectRow[];
}, ClientProjectDistribution[]> {
  calculate(input: { clients: ClientRow[]; projects: ProjectRow[] }): ClientProjectDistribution[] {
    const { clients, projects } = input;
    
    return clients.map(client => {
      const clientProjects = projects.filter(p => p.clientId === client.id);
      
      return {
        clientId: client.id,
        clientName: client.name,
        projectCount: clientProjects.length,
        activeProjects: clientProjects.filter(p => p.status === 'active').length,
        completedProjects: clientProjects.filter(p => p.status === 'done').length,
        blockedProjects: clientProjects.filter(p => p.status === 'blocked').length,
      };
    }).filter(d => d.projectCount > 0)
      .sort((a, b) => b.projectCount - a.projectCount);
  }
}

/**
 * Client timeline calculator (for trend analysis)
 */
export class ClientTimelineCalculator implements IStatisticsCalculator<{
  clients: ClientRow[];
}, ClientTimelineData[]> {
  calculate(input: { clients: ClientRow[] }): ClientTimelineData[] {
    const { clients } = input;
    
    // Group by month
    const monthMap = new Map<string, number>();
    const sortedClients = [...clients].sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    let runningTotal = 0;
    sortedClients.forEach(client => {
      const date = new Date(client.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + 1);
    });

    // Build timeline with cumulative totals
    const timeline: ClientTimelineData[] = [];
    const sortedMonths = Array.from(monthMap.keys()).sort();
    
    sortedMonths.forEach(month => {
      runningTotal += monthMap.get(month) || 0;
      timeline.push({
        month,
        newClients: monthMap.get(month) || 0,
        totalClients: runningTotal,
      });
    });

    // Return last 12 months
    return timeline.slice(-12);
  }
}

/**
 * Lead conversion by client calculator
 */
export class ClientLeadConversionCalculator implements IStatisticsCalculator<{
  clients: ClientRow[];
  leads: LeadRow[];
}, Array<{ clientName: string; wonLeads: number; lostLeads: number; conversionRate: number }>> {
  calculate(input: { clients: ClientRow[]; leads: LeadRow[] }) {
    const { clients, leads } = input;
    
    // Group leads by client (using convertedClientId)
    const leadsByClient = new Map<string, LeadRow[]>();
    leads.forEach(lead => {
      const clientId = (lead as any).convertedClientId || (lead as any).clientId;
      if (clientId) {
        const clientLeads = leadsByClient.get(clientId) || [];
        clientLeads.push(lead);
        leadsByClient.set(clientId, clientLeads);
      }
    });

    return Array.from(leadsByClient.entries())
      .map(([clientId, clientLeads]) => {
        const client = clients.find(c => c.id === clientId);
        const wonLeads = clientLeads.filter(l => l.status === 'won').length;
        const lostLeads = clientLeads.filter(l => l.status === 'lost').length;
        const totalClosed = wonLeads + lostLeads;
        const conversionRate = totalClosed > 0 ? Math.round((wonLeads / totalClosed) * 100) : 0;

        return {
          clientName: client?.name || "Unknown",
          wonLeads,
          lostLeads,
          conversionRate,
        };
      })
      .filter(d => d.wonLeads + d.lostLeads > 0)
      .sort((a, b) => b.conversionRate - a.conversionRate)
      .slice(0, 10);
  }
}

/**
 * Main service facade
 */
export default class ClientStatisticsService {
  private static clientStatsCalculator = new ClientStatisticsCalculator();
  private static distributionCalculator = new ClientProjectDistributionCalculator();
  private static timelineCalculator = new ClientTimelineCalculator();
  private static leadConversionCalculator = new ClientLeadConversionCalculator();

  static calculateStatistics(clients: ClientRow[], projects: ProjectRow[]): ClientStatistics {
    return this.clientStatsCalculator.calculate({ clients, projects });
  }

  static calculateDistribution(clients: ClientRow[], projects: ProjectRow[]): ClientProjectDistribution[] {
    return this.distributionCalculator.calculate({ clients, projects });
  }

  static calculateTimeline(clients: ClientRow[]): ClientTimelineData[] {
    return this.timelineCalculator.calculate({ clients });
  }

  static calculateLeadConversion(clients: ClientRow[], leads: LeadRow[]) {
    return this.leadConversionCalculator.calculate({ clients, leads });
  }
}
