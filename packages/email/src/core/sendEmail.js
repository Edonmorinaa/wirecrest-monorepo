import { createSMTPClient } from './smtp';
const smtpClient = createSMTPClient();
/**
 * Core email sending function
 * This is the main function that all other email functions use
 */
export const sendEmail = async (data) => {
    await smtpClient.sendEmail(data);
};
//# sourceMappingURL=sendEmail.js.map