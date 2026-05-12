import { UserRole } from "@prisma/client";
import { db } from "./db";

type SessionUser = {
  id: string;
  role: UserRole | string;
};

function appendScope(where: Record<string, any>, scope?: Record<string, any>) {
  if (!scope) {
    return where;
  }

  if (Object.keys(where).length === 0) {
    return scope;
  }

  return {
    AND: [where, scope],
  };
}

export function getJobAccessScope(sessionUser: SessionUser) {
  if (sessionUser.role === "ADMIN") {
    return undefined;
  }

  if (sessionUser.role === "TECHNICIAN") {
    return { assignedTechnicianId: sessionUser.id };
  }

  if (sessionUser.role === "CUSTOMER") {
    return { customer: { userId: sessionUser.id } };
  }

  return { id: "__forbidden__" };
}

export function getCustomerAccessScope(sessionUser: SessionUser) {
  if (sessionUser.role === "ADMIN") {
    return undefined;
  }

  if (sessionUser.role === "TECHNICIAN") {
    return { jobs: { some: { assignedTechnicianId: sessionUser.id } } };
  }

  if (sessionUser.role === "CUSTOMER") {
    return { userId: sessionUser.id };
  }

  return { id: "__forbidden__" };
}

export function getInvoiceAccessScope(sessionUser: SessionUser) {
  if (sessionUser.role === "ADMIN") {
    return undefined;
  }

  if (sessionUser.role === "TECHNICIAN") {
    return { job: { assignedTechnicianId: sessionUser.id } };
  }

  if (sessionUser.role === "CUSTOMER") {
    return { customer: { userId: sessionUser.id } };
  }

  return { id: "__forbidden__" };
}

export function getQuoteAccessScope(sessionUser: SessionUser) {
  if (sessionUser.role === "ADMIN") {
    return undefined;
  }

  if (sessionUser.role === "TECHNICIAN") {
    return { job: { assignedTechnicianId: sessionUser.id } };
  }

  if (sessionUser.role === "CUSTOMER") {
    return { customer: { userId: sessionUser.id } };
  }

  return { id: "__forbidden__" };
}

export function withJobAccessScope(where: Record<string, any>, sessionUser: SessionUser) {
  return appendScope(where, getJobAccessScope(sessionUser));
}

export function withCustomerAccessScope(where: Record<string, any>, sessionUser: SessionUser) {
  return appendScope(where, getCustomerAccessScope(sessionUser));
}

export function withInvoiceAccessScope(where: Record<string, any>, sessionUser: SessionUser) {
  return appendScope(where, getInvoiceAccessScope(sessionUser));
}

export function withQuoteAccessScope(where: Record<string, any>, sessionUser: SessionUser) {
  return appendScope(where, getQuoteAccessScope(sessionUser));
}

export async function canAccessJob(sessionUser: SessionUser, jobId: string) {
  const job = await db.job.findFirst({
    where: withJobAccessScope({ id: jobId }, sessionUser),
    select: { id: true },
  });

  return Boolean(job);
}

export async function canAccessCustomer(sessionUser: SessionUser, customerId: string) {
  const customer = await db.customer.findFirst({
    where: withCustomerAccessScope({ id: customerId }, sessionUser),
    select: { id: true },
  });

  return Boolean(customer);
}

export async function canAccessInvoice(sessionUser: SessionUser, invoiceId: string) {
  const invoice = await db.invoice.findFirst({
    where: withInvoiceAccessScope({ id: invoiceId }, sessionUser),
    select: { id: true },
  });

  return Boolean(invoice);
}

export async function canAccessQuote(sessionUser: SessionUser, quoteId: string) {
  const quote = await db.quote.findFirst({
    where: withQuoteAccessScope({ id: quoteId }, sessionUser),
    select: { id: true },
  });

  return Boolean(quote);
}
