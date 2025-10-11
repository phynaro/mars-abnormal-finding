import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type TicketApproval } from '@/services/administrationService';

interface CopyPermissionsDialogProps {
  show: boolean;
  onClose: () => void;
  onCopy: () => void;
  approvals: TicketApproval[];
  currentPersonno: number;
  loading: boolean;
  copyFromPersonno: number | null;
  copyFromApprovalLevel: number | null;
  setCopyFromPersonno: (personno: number | null) => void;
  setCopyFromApprovalLevel: (level: number | null) => void;
}

const CopyPermissionsDialog: React.FC<CopyPermissionsDialogProps> = ({
  show,
  onClose,
  onCopy,
  approvals,
  currentPersonno,
  loading,
  copyFromPersonno,
  copyFromApprovalLevel,
  setCopyFromPersonno,
  setCopyFromApprovalLevel
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle>Copy Permissions from Existing User</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Select User to Copy From */}
          <div>
            <Label htmlFor="copy-from-user">Select User to Copy From *</Label>
            <Select
              value={copyFromPersonno?.toString() || ''}
              onValueChange={(value) => setCopyFromPersonno(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                {approvals
                  .filter(approval => approval.personno !== currentPersonno) // Exclude current user
                  .reduce((unique, approval) => {
                    if (!unique.find(u => u.personno === approval.personno)) {
                      unique.push(approval);
                    }
                    return unique;
                  }, [] as TicketApproval[])
                  .map((approval) => (
                    <SelectItem key={approval.personno} value={approval.personno.toString()}>
                      {approval.person_name || `Person #${approval.personno}`}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Select Approval Level to Copy From */}
          {copyFromPersonno && (
            <div>
              <Label htmlFor="copy-from-level">Select Approval Level to Copy From *</Label>
              <Select
                value={copyFromApprovalLevel?.toString() || ''}
                onValueChange={(value) => setCopyFromApprovalLevel(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select approval level" />
                </SelectTrigger>
                <SelectContent>
                  {approvals
                    .filter(approval => approval.personno === copyFromPersonno)
                    .reduce((unique, approval) => {
                      if (!unique.find(u => u.approval_level === approval.approval_level)) {
                        unique.push(approval);
                      }
                      return unique;
                    }, [] as TicketApproval[])
                    .map((approval) => (
                      <SelectItem key={approval.approval_level} value={approval.approval_level.toString()}>
                        Level {approval.approval_level}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button 
              onClick={onCopy}
              disabled={loading || !copyFromPersonno || !copyFromApprovalLevel}
            >
              {loading ? 'Copying...' : 'Copy Permissions'}
            </Button>
            <Button 
              variant="outline" 
              onClick={onClose}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CopyPermissionsDialog;

