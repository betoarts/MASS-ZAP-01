"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { Contact } from "@/lib/contact-storage";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ContactDetailsTableProps {
  contacts: Contact[];
  onEdit: (contact: Contact) => void;
  onDelete: (id: string) => void;
}

export const ContactDetailsTable: React.FC<ContactDetailsTableProps> = ({
  contacts,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Número de Telefone</TableHead>
            <TableHead>Nome Completo</TableHead>
            <TableHead>Primeiro Nome</TableHead>
            <TableHead>Dados Personalizados</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                Nenhum contato nesta lista. Adicione um para começar!
              </TableCell>
            </TableRow>
          ) : (
            contacts.map((contact) => (
              <TableRow key={contact.id}>
                <TableCell className="font-medium">{contact.phoneNumber}</TableCell>
                <TableCell>{contact.fullName || "-"}</TableCell>
                <TableCell>{contact.firstName || "-"}</TableCell>
                <TableCell>
                  {contact.custom_data ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-auto px-2 py-1 text-xs">Ver Dados</Button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs p-2">
                        <pre className="text-xs whitespace-pre-wrap break-all">
                          {JSON.stringify(contact.custom_data, null, 2)}
                        </pre>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(contact)}
                        className="mr-2"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Editar Contato</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(contact.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Excluir Contato</TooltipContent>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};