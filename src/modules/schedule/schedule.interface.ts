export interface CreateScheduleInterface {
  startDateTime: Date;
  endDateTime: Date;
  meetingLink: string;
}
export interface UpdateScheduleInterface {
  startDateTime?: Date;
  endDateTime?: Date;
  meetingLink?: string;
}
