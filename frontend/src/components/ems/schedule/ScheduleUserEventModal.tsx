import React, { type ComponentProps } from 'react';

import CalibrationUserEventModal from '@/components/dashboard/calibration/CalibrationUserEventModal';

type Props = Omit<ComponentProps<typeof CalibrationUserEventModal>, 'layout'>;

const ScheduleUserEventModal = (props: Props) => {
  return <CalibrationUserEventModal {...props} layout="landscape" />;
};

export default ScheduleUserEventModal;
