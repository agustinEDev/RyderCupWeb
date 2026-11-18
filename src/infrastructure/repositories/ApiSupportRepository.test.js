import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ApiSupportRepository from './ApiSupportRepository';
import ISupportRepository from '../../domain/repositories/ISupportRepository';
import * as apiModule from '../http/api';

// Es un endpoint público: no debe pasar por apiRequest
vi.mock('../http/api', () => ({ default: vi.fn() }));

const formData = {
  name: 'Ana García',
  email: 'ana@example.com',
  category: 'BUG',
  subject: 'No carga',
  message: 'La clasificación no carga',
};

const respuesta = ({ ok = true, status = 200, body = '' } = {}) => ({
  ok,
  status,
  text: vi.fn().mockResolvedValue(body),
});

describe('ApiSupportRepository', () => {
  let repository;
  let fetchMock;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    repository = new ApiSupportRepository();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('implements ISupportRepository', () => {
    expect(repository).toBeInstanceOf(ISupportRepository);
  });

  it('POSTs the form as JSON to /api/v1/support/contact with plain fetch', async () => {
    fetchMock.mockResolvedValue(
      respuesta({ body: JSON.stringify({ message: 'ok' }) }),
    );

    await repository.submitContactForm(formData);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toMatch(/^(https?:\/\/[^/]+)?\/api\/v1\/support\/contact$/);
    expect(options).toEqual({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    // Sin credenciales ni CSRF: no se usa el cliente autenticado
    expect(options.credentials).toBeUndefined();
    expect(apiModule.default).not.toHaveBeenCalled();
  });

  it('returns the parsed JSON body', async () => {
    fetchMock.mockResolvedValue(
      respuesta({ status: 201, body: '{"message":"Message sent"}' }),
    );

    await expect(repository.submitContactForm(formData)).resolves.toEqual({
      message: 'Message sent',
    });
  });

  it('throws NETWORK_ERROR when fetch rejects', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    const error = await repository.submitContactForm(formData).catch((e) => e);

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('NETWORK_ERROR');
    expect(error.code).toBe('NETWORK_ERROR');
    expect(error.status).toBeUndefined();
  });

  it.each([400, 422, 429, 500])(
    'throws SUBMIT_FAILED with the status on HTTP %i, without reading the body',
    async (status) => {
      const res = respuesta({ ok: false, status, body: '{"detail":"x"}' });
      fetchMock.mockResolvedValue(res);

      const error = await repository
        .submitContactForm(formData)
        .catch((e) => e);

      expect(error.message).toBe('SUBMIT_FAILED');
      expect(error.code).toBe('SUBMIT_FAILED');
      expect(error.status).toBe(status);
      expect(res.text).not.toHaveBeenCalled();
    },
  );

  it('throws INVALID_JSON_RESPONSE with status and a 200-char snippet when the body is not JSON', async () => {
    const body = `<html>${'x'.repeat(300)}</html>`;
    fetchMock.mockResolvedValue(respuesta({ status: 200, body }));

    const error = await repository.submitContactForm(formData).catch((e) => e);

    expect(error.code).toBe('INVALID_JSON_RESPONSE');
    expect(error.status).toBe(200);
    expect(error.message).toContain('Invalid JSON response (status 200): ');
    expect(error.message).toContain(body.substring(0, 200));
    expect(error.message).not.toContain(body.substring(0, 201));
  });

  it('throws INVALID_JSON_RESPONSE on an empty body', async () => {
    fetchMock.mockResolvedValue(respuesta({ status: 204, body: '' }));

    const error = await repository.submitContactForm(formData).catch((e) => e);

    expect(error.code).toBe('INVALID_JSON_RESPONSE');
    expect(error.status).toBe(204);
  });

  it('propagates an error while reading the body', async () => {
    const readError = new Error('stream aborted');
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      text: vi.fn().mockRejectedValue(readError),
    });

    await expect(repository.submitContactForm(formData)).rejects.toBe(
      readError,
    );
  });
});
