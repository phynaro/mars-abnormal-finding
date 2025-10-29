import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/useToast';
import { useLanguage } from '@/contexts/LanguageContext';
import { ticketService } from '@/services/ticketService';
import { userManagementService, type User } from '@/services/userManagementService';
import { authService } from '@/services/authService';
import { getAvatarUrl } from '@/utils/url';
import HierarchicalMachineSelector from '@/components/tickets/HierarchicalMachineSelector';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { PageHeader } from '@/components/common/PageHeader';
import { Mail, MessageSquare, User as UserIcon, CheckCircle2, XCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';

interface PUCODEResult {
  PUCODE: string;
  PUDESC: string;
  PUNO: number;
  PLANT: string;
  AREA: string;
  LINE: string;
  MACHINE: string;
  NUMBER: string;
  PUCRITICALNO: number;
}

interface SelectedMachine {
  puno: number;
  pucode: string;
  plant: string;
  area: string;
  line: string;
  machine: string;
  number: string;
  puname: string;
  pudescription: string;
  digit_count: number;
}

interface NotificationRecipient {
  PERSONNO: number;
  PERSON_NAME: string;
  EMAIL: string | null;
  LineID: string | null;
  AvatarUrl: string | null;
  notification_reason: string;
  recipient_type: string;
}

const ACTION_TYPES = [
  { value: 'create', label: 'Create Ticket' },
  { value: 'accept', label: 'Accept Ticket' },
  { value: 'start', label: 'Start Work' },
  { value: 'finish', label: 'Finish Work' },
  { value: 'reject', label: 'Reject Ticket' },
  { value: 'escalate', label: 'Escalate Ticket' },
  { value: 'plan', label: 'Plan Ticket' },
  { value: 'reassign', label: 'Reassign Ticket' },
  { value: 'reopen', label: 'Reopen Ticket' },
  { value: 'approve_review', label: 'Approve Review' },
  { value: 'approve_close', label: 'Approve Close' },
];

const NotificationTestingPage: React.FC = () => {
  const { toast } = useToast();
  const { t } = useLanguage();
  
  // Machine selection state
  const [selectionMode, setSelectionMode] = useState<'search' | 'hierarchy'>('hierarchy');
  const [machineSearchQuery, setMachineSearchQuery] = useState('');
  const [machineSearchResults, setMachineSearchResults] = useState<PUCODEResult[]>([]);
  const [machineSearchLoading, setMachineSearchLoading] = useState(false);
  const [machineSearchDropdownOpen, setMachineSearchDropdownOpen] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<SelectedMachine | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const skipNextSearchRef = useRef(false);

  // Form state
  const [actionType, setActionType] = useState<string>('');
  const [createdBy, setCreatedBy] = useState<number | undefined>(undefined);
  const [assignedTo, setAssignedTo] = useState<number | undefined>(undefined);
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState({ created: '', assigned: '' });

  // Results state
  const [recipients, setRecipients] = useState<NotificationRecipient[]>([]);
  const [loading, setLoading] = useState(false);

  // Load users for dropdowns
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setUsersLoading(true);
      const fetchedUsers = await userManagementService.getAllUsers();
      setUsers(fetchedUsers);
    } catch (error) {
      console.error('Failed to load users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive'
      });
    } finally {
      setUsersLoading(false);
    }
  };

  // Machine search function
  const searchMachines = async (query: string) => {
    if (query.length < 2) {
      setMachineSearchResults([]);
      setMachineSearchLoading(false);
      setIsSearching(false);
      return;
    }

    try {
      setIsSearching(true);
      setMachineSearchLoading(true);
      const response = await fetch(`${API_BASE_URL}/hierarchy/pucode/search?search=${encodeURIComponent(query)}`, {
        headers: authService.getAuthHeaders()
      });
      const data = await response.json();
      if (data.success) {
        setMachineSearchResults(data.data || []);
        if (data.data && data.data.length > 0) {
          setMachineSearchDropdownOpen(true);
        }
      } else {
        setMachineSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching machines:', error);
      setMachineSearchResults([]);
      toast({
        title: 'Error',
        description: 'Failed to search machines. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setMachineSearchLoading(false);
      setIsSearching(false);
    }
  };

  // Debounced search
  useEffect(() => {
    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false;
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (machineSearchQuery.length < 2) {
      setMachineSearchResults([]);
      setMachineSearchLoading(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setMachineSearchDropdownOpen(true);

    searchTimeoutRef.current = setTimeout(async () => {
      await searchMachines(machineSearchQuery);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [machineSearchQuery]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      const dropdown = target.closest('.search-dropdown');
      const input = target.closest('input');
      
      if (searchInputRef.current && !searchInputRef.current.contains(target) && !dropdown && !input) {
        setMachineSearchDropdownOpen(false);
      }
    };

    if (machineSearchDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [machineSearchDropdownOpen]);

  const onSelectMachine = (machine: PUCODEResult) => {
    const selected: SelectedMachine = {
      puno: machine.PUNO,
      pucode: machine.PUCODE,
      plant: machine.PLANT,
      area: machine.AREA,
      line: machine.LINE,
      machine: machine.MACHINE,
      number: machine.NUMBER,
      puname: machine.PUDESC,
      pudescription: machine.PUDESC,
      digit_count: 0
    };
    setSelectedMachine(selected);
    skipNextSearchRef.current = true;
    setMachineSearchQuery(machine.PUCODE);
    setMachineSearchDropdownOpen(false);
    
    if (searchInputRef.current) {
      searchInputRef.current.blur();
    }
  };

  const clearMachineSelection = () => {
    setSelectedMachine(null);
    skipNextSearchRef.current = true;
    setMachineSearchQuery('');
    setMachineSearchResults([]);
    setMachineSearchDropdownOpen(false);
    setIsSearching(false);
    setMachineSearchLoading(false);
    
    if (searchInputRef.current) {
      searchInputRef.current.blur();
    }
  };

  const onHierarchicalMachineSelect = (machine: any) => {
    const selected: SelectedMachine = {
      puno: machine.puno,
      pucode: machine.pucode,
      plant: machine.plant,
      area: machine.area,
      line: machine.line,
      machine: machine.machine,
      number: machine.number,
      puname: machine.puname || machine.pudescription,
      pudescription: machine.pudescription || machine.puname,
      digit_count: machine.digit_count || 0
    };
    setSelectedMachine(selected);
  };

  const onHierarchicalMachineClear = () => {
    setSelectedMachine(null);
  };

  const handleTest = async () => {
    if (!selectedMachine || !actionType) {
      toast({
        title: 'Validation Error',
        description: 'Please select a PU and action type',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);
      setRecipients([]);

      const result = await ticketService.testNotificationRecipients(
        selectedMachine.puno,
        actionType,
        createdBy || assignedTo ? {
          created_by: createdBy,
          assigned_to: assignedTo
        } : undefined
      );

      if (result.success) {
        setRecipients(result.data || []);
        toast({
          title: 'Success',
          description: `Found ${result.count} notification recipient(s)`,
        });
      }
    } catch (error) {
      console.error('Error testing notifications:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to get notification recipients',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter users for search
  const filterUsers = (query: string) => {
    if (!query) return users;
    const lowerQuery = query.toLowerCase();
    return users.filter(user => 
      user.fullName?.toLowerCase().includes(lowerQuery) ||
      user.firstName?.toLowerCase().includes(lowerQuery) ||
      user.lastName?.toLowerCase().includes(lowerQuery) ||
      user.username?.toLowerCase().includes(lowerQuery) ||
      user.email?.toLowerCase().includes(lowerQuery)
    );
  };

  const getRecipientTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'L2ForPU':
      case 'L3ForPU':
      case 'L4ForPU':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'requester':
      case 'creator':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'assignee':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const filteredCreatedByUsers = filterUsers(userSearchQuery.created);
  const filteredAssignedToUsers = filterUsers(userSearchQuery.assigned);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Notification Testing"
        description="Test which users will receive notifications for different ticket actions"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Card */}
        <Card>
          <CardHeader>
            <CardTitle>Test Configuration</CardTitle>
            <CardDescription>
              Select a PU and action type to see who would receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Selection Mode Toggle */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant={selectionMode === 'hierarchy' ? 'default' : 'outline'}
                onClick={() => setSelectionMode('hierarchy')}
                className="flex-1"
              >
                Hierarchy
              </Button>
              <Button
                type="button"
                variant={selectionMode === 'search' ? 'default' : 'outline'}
                onClick={() => setSelectionMode('search')}
                className="flex-1"
              >
                Search
              </Button>
            </div>

            {/* PU Selection */}
            {selectionMode === 'hierarchy' ? (
              <>
                <HierarchicalMachineSelector
                  onMachineSelect={onHierarchicalMachineSelect}
                  onClear={onHierarchicalMachineClear}
                  selectedMachineData={selectedMachine}
                />
                {/* Selected PU Display */}
                {selectedMachine && (
                  <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="font-semibold text-green-800 dark:text-green-200">
                        Selected Production Unit
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={onHierarchicalMachineClear}
                        className="h-7 text-xs text-green-700 dark:text-green-300 hover:text-green-900 dark:hover:text-green-100"
                      >
                        Clear
                      </Button>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium text-green-700 dark:text-green-300">PU Code:</span>{' '}
                        <span className="text-green-800 dark:text-green-200">{selectedMachine.pucode}</span>
                      </div>
                      <div>
                        <span className="font-medium text-green-700 dark:text-green-300">PU Name:</span>{' '}
                        <span className="text-green-800 dark:text-green-200">{selectedMachine.pudescription || selectedMachine.puname}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-green-200 dark:border-green-700">
                        {selectedMachine.plant && (
                          <div>
                            <span className="font-medium text-green-700 dark:text-green-300">Plant:</span>{' '}
                            <span className="text-green-800 dark:text-green-200">{selectedMachine.plant}</span>
                          </div>
                        )}
                        {selectedMachine.area && (
                          <div>
                            <span className="font-medium text-green-700 dark:text-green-300">Area:</span>{' '}
                            <span className="text-green-800 dark:text-green-200">{selectedMachine.area}</span>
                          </div>
                        )}
                        {selectedMachine.line && (
                          <div>
                            <span className="font-medium text-green-700 dark:text-green-300">Line:</span>{' '}
                            <span className="text-green-800 dark:text-green-200">{selectedMachine.line}</span>
                          </div>
                        )}
                        {selectedMachine.machine && (
                          <div>
                            <span className="font-medium text-green-700 dark:text-green-300">Machine:</span>{' '}
                            <span className="text-green-800 dark:text-green-200">{selectedMachine.machine}</span>
                          </div>
                        )}
                      </div>
                      {selectedMachine.puno && (
                        <div className="text-xs text-green-600 dark:text-green-400 mt-2">
                          PU Number: {selectedMachine.puno}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-2">
                <Label>Search Production Unit</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    ref={searchInputRef}
                    placeholder="Search by PUCODE..."
                    value={machineSearchQuery}
                    onChange={(e) => setMachineSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {machineSearchDropdownOpen && (
                  <div className="search-dropdown absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto">
                    {machineSearchLoading ? (
                      <div className="p-4 text-center text-sm text-gray-500">Loading...</div>
                    ) : machineSearchResults.length > 0 ? (
                      machineSearchResults.map((machine, index) => (
                        <div
                          key={`${machine.PUCODE}-${index}`}
                          className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-200 dark:border-gray-700 last:border-b-0"
                          onClick={() => onSelectMachine(machine)}
                        >
                          <div className="font-medium">{machine.PUCODE}</div>
                          <div className="text-sm text-gray-500">{machine.PUDESC}</div>
                        </div>
                      ))
                    ) : machineSearchQuery.length >= 2 ? (
                      <div className="p-4 text-center text-sm text-gray-500">No machines found</div>
                    ) : null}
                  </div>
                )}
                {selectedMachine && (
                  <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
                    <div className="font-medium text-green-800 dark:text-green-200">
                      Selected: {selectedMachine.pucode}
                    </div>
                    <div className="text-sm text-green-600 dark:text-green-300">
                      {selectedMachine.pudescription}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearMachineSelection}
                      className="mt-2 h-7 text-xs"
                    >
                      Clear
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Action Type */}
            <div className="space-y-2">
              <Label>Action Type *</Label>
              <Select value={actionType} onValueChange={setActionType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select action type" />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_TYPES.map(action => (
                    <SelectItem key={action.value} value={action.value}>
                      {action.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Optional: Created By */}
            <div className="space-y-2">
              <Label>Created By (Optional)</Label>
              <Select
                value={createdBy?.toString() || 'none'}
                onValueChange={(value) => setCreatedBy(value === 'none' ? undefined : parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select creator/requester" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.fullName || `${user.firstName} ${user.lastName}`} ({user.username})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Optional: Assigned To */}
            <div className="space-y-2">
              <Label>Assigned To (Optional)</Label>
              <Select
                value={assignedTo?.toString() || 'none'}
                onValueChange={(value) => setAssignedTo(value === 'none' ? undefined : parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.fullName || `${user.firstName} ${user.lastName}`} ({user.username})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleTest}
              disabled={!selectedMachine || !actionType || loading}
              className="w-full"
            >
              {loading ? 'Checking...' : 'Check Recipients'}
            </Button>

            <p className="text-xs text-gray-500 mt-2">
              Note: Actor (person performing the action) is automatically excluded from results.
            </p>
          </CardContent>
        </Card>

        {/* Results Card */}
        <Card>
          <CardHeader>
            <CardTitle>Notification Recipients</CardTitle>
            <CardDescription>
              {recipients.length > 0
                ? `${recipients.length} user(s) will receive notifications`
                : 'Select configuration and click "Check Recipients" to see results'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <LoadingSpinner message="Checking recipients..." />
              </div>
            ) : recipients.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No recipients found. Select a PU and action type, then click "Check Recipients".
              </div>
            ) : (
              <div className="space-y-4">
                {recipients.map((recipient, index) => {
                  const initials = recipient.PERSON_NAME
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);

                  return (
                    <div
                      key={`${recipient.PERSONNO}-${index}`}
                      className="flex items-start gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <Avatar className="h-12 w-12 flex-shrink-0">
                        {recipient.AvatarUrl ? (
                          <AvatarImage src={getAvatarUrl(recipient.AvatarUrl)} alt={recipient.PERSON_NAME} />
                        ) : null}
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {initials}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-medium text-sm">{recipient.PERSON_NAME}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              ID: {recipient.PERSONNO}
                            </div>
                          </div>
                          <Badge className={getRecipientTypeBadgeColor(recipient.recipient_type)}>
                            {recipient.recipient_type}
                          </Badge>
                        </div>

                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {recipient.notification_reason}
                        </div>

                        <div className="flex items-center gap-4 text-xs">
                          <div className="flex items-center gap-1">
                            {recipient.EMAIL ? (
                              <>
                                <Mail className="h-3 w-3 text-green-600" />
                                <span className="text-green-600">{recipient.EMAIL}</span>
                              </>
                            ) : (
                              <>
                                <Mail className="h-3 w-3 text-gray-400" />
                                <span className="text-gray-400">No email</span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {recipient.LineID ? (
                              <>
                                <MessageSquare className="h-3 w-3 text-blue-600" />
                                <span className="text-blue-600">LINE: {recipient.LineID}</span>
                              </>
                            ) : (
                              <>
                                <MessageSquare className="h-3 w-3 text-gray-400" />
                                <span className="text-gray-400">No LINE ID</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NotificationTestingPage;
