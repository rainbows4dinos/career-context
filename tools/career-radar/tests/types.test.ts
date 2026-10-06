import { createRadarDataAccess } from '../data.js';
import { createRadarClient } from '../supabase-client.js';

// Compile-only contract tests. No client is created or HTTP request made.
function typeContract(data: ReturnType<typeof createRadarDataAccess>) {
  const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const revision = '2026-10-06T12:00:00.123456+00:00';
  void data.createProspect({ id, company: 'Example', title: 'Designer' });
  void data.updateAssessment(id, { systems_fit: 5, personal_interest: null }, revision);
  void data.setConnections(id, [{ id, name: 'Alex' }], revision);
  void data.changeStatus(id, 'interviewing', revision);
  // @ts-expect-error company and title are required
  void data.createProspect({ id });
  // @ts-expect-error ownership is database-managed
  void data.updateProspect(id, { owner_id: id }, revision);
  // @ts-expect-error scores cannot be outside 1-5
  void data.updateAssessment(id, { systems_fit: 6 }, revision);
  // @ts-expect-error personal interest is numeric, not prose
  void data.updateAssessment(id, { personal_interest: 'high' }, revision);
  // @ts-expect-error status is a controlled vocabulary
  void data.changeStatus(id, 'invented', revision);
  // @ts-expect-error connections need stable IDs
  void data.setConnections(id, [{ name: 'Alex' }], revision);
  // @ts-expect-error history has no public mutation API
  void data.createStatusEvent({ prospect_id: id, to_status: 'offer' });
}

type Client = ReturnType<typeof createRadarClient>;
function generatedSchemaContract(client: Client) {
  void client.from('prospects').select('company,title');
  // @ts-expect-error no generalized ATS/company table
  void client.from('companies');
}

void typeContract;
void generatedSchemaContract;
