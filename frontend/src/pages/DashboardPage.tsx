import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  LayoutDashboard, 
  Ticket, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  TrendingUp,
  Users,
  Wrench
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();

  // Mock data - in real app this would come from API
  const stats = [
    {
      title: t('dashboard.totalTickets'),
      value: '156',
      change: '+12%',
      changeType: 'positive',
      icon: <Ticket className="h-6 w-6" />
    },
    {
      title: t('dashboard.openTickets'),
      value: '23',
      change: '+5%',
      changeType: 'negative',
      icon: <Clock className="h-6 w-6" />
    },
    {
      title: t('dashboard.closedTickets'),
      value: '133',
      change: '+8%',
      changeType: 'positive',
      icon: <CheckCircle className="h-6 w-6" />
    },
    {
      title: 'Critical Issues',
      value: '3',
      change: '-2',
      changeType: 'positive',
      icon: <AlertTriangle className="h-6 w-6" />
    }
  ];

  const recentTickets = [
    {
      id: 'TKT-001',
      title: 'Machine A overheating',
      status: 'Open',
      priority: 'High',
      assignedTo: 'David Lee',
      createdAt: '2 hours ago'
    },
    {
      id: 'TKT-002',
      title: 'Quality check failed',
      status: 'In Progress',
      priority: 'Medium',
      assignedTo: 'Emma Davis',
      createdAt: '4 hours ago'
    },
    {
      id: 'TKT-003',
      title: 'Maintenance scheduled',
      status: 'Completed',
      priority: 'Low',
      assignedTo: 'Alex Garcia',
      createdAt: '1 day ago'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200';
      case 'Completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200';
      case 'Medium':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-200';
      case 'Low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-200';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Welcome Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-3">
            <LayoutDashboard className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">
                {t('dashboard.welcome')}, {user?.firstName}!
              </h1>
              <p className="text-muted-foreground">
                Here's what's happening with your CMMS system today
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold">
                    {stat.value}
                  </p>
                </div>
                <div className={`p-3 rounded-full ${
                  stat.changeType === 'positive' 
                    ? 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                    : 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                }`}>
                  {stat.icon}
                </div>
              </div>
              <div className="mt-4">
                <span className={`text-sm font-medium ${
                  stat.changeType === 'positive' 
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {stat.change}
                </span>
                <span className="text-sm text-muted-foreground ml-1">
                  from last month
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Tickets */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t('dashboard.recentActivity')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTickets.map((ticket) => (
                <Card key={ticket.id} className="hover:bg-accent/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-sm font-medium">
                          {ticket.id}
                        </h3>
                        <Badge variant="outline" className={getStatusColor(ticket.status)}>
                          {ticket.status}
                        </Badge>
                        <Badge variant="outline" className={getPriorityColor(ticket.priority)}>
                          {ticket.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {ticket.title}
                      </p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                        <span>Assigned to: {ticket.assignedTo}</span>
                        <span>{ticket.createdAt}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="mt-6">
              <Button variant="outline" className="w-full">
                View All Tickets
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="ghost" className="w-full justify-start">
              <Ticket className="h-5 w-5 mr-3" />
              <span>Create New Ticket</span>
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              <Wrench className="h-5 w-5 mr-3" />
              <span>Schedule Maintenance</span>
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              <TrendingUp className="h-5 w-5 mr-3" />
              <span>View Reports</span>
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              <Users className="h-5 w-5 mr-3" />
              <span>Manage Users</span>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
