export interface WorkflowTemplate {
  templateId: string;
  title: string;
  creatorTenantId: string;
  targetRating: string;
  isActive: boolean;
}

export class ConsultantTemplateRegistry {
  private static registeredTemplates: WorkflowTemplate[] = [
    {
      templateId: "WFLOW-TEMP-01",
      title: "Commercial High-Rise IGBC Baseline",
      creatorTenantId: "tenant-alpha",
      targetRating: "IGBC Commercial",
      isActive: true
    }
  ];

  static getTemplates(): WorkflowTemplate[] {
    return this.registeredTemplates;
  }

  static cloneTemplate(templateId: string, targetTenantId: string): WorkflowTemplate {
    const found = this.registeredTemplates.find((t) => t.templateId === templateId);
    if (!found) throw new Error("Template not found in registry");

    return {
      ...found,
      templateId: `CLONE-${templateId}-${Math.floor(Math.random() * 900 + 100)}`,
      creatorTenantId: targetTenantId
    };
  }
}
