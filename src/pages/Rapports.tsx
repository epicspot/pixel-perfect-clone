import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, TrendingUp, Users, Ticket } from 'lucide-react';

const reports = [
  {
    id: 1,
    title: 'Rapport mensuel des ventes',
    description: 'Résumé des ventes de tickets pour le mois en cours',
    icon: TrendingUp,
    type: 'Ventes',
    date: 'Décembre 2024',
  },
  {
    id: 2,
    title: 'Analyse des passagers',
    description: 'Statistiques détaillées sur les passagers',
    icon: Users,
    type: 'Passagers',
    date: 'Décembre 2024',
  },
  {
    id: 3,
    title: 'Performance des lignes',
    description: 'Taux d\'occupation et revenus par ligne',
    icon: Ticket,
    type: 'Lignes',
    date: 'Décembre 2024',
  },
];

const Rapports = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="animate-fade-in">
          <h1 className="text-3xl font-display font-bold text-foreground">Rapports</h1>
          <p className="text-muted-foreground mt-1">Consultez et exportez vos rapports d'activité</p>
        </div>

        {/* Reports Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((report, index) => (
            <Card 
              key={report.id}
              className="p-6 hover:border-primary/30 hover:shadow-lg transition-all duration-300 cursor-pointer animate-slide-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-lg gradient-primary">
                  <report.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded">
                  {report.type}
                </span>
              </div>
              
              <h3 className="font-display font-semibold text-lg text-card-foreground mb-2">
                {report.title}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {report.description}
              </p>
              
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <span className="text-xs text-muted-foreground">{report.date}</span>
                <Button variant="ghost" size="sm" className="gap-2 text-primary hover:text-primary">
                  <Download className="w-4 h-4" />
                  Exporter
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Empty state for more reports */}
        <div className="bg-card rounded-xl border border-dashed border-border p-12 text-center animate-slide-up" style={{ animationDelay: '300ms' }}>
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display font-semibold text-lg text-card-foreground mb-2">
            Plus de rapports à venir
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Connectez votre API Laravel pour générer des rapports personnalisés basés sur vos données réelles.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Rapports;
