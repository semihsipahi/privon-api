import { Injectable } from '@nestjs/common';
import * as Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class TemplateService {
  private templates: Map<string, HandlebarsTemplateDelegate> = new Map();

  constructor() {
    this.loadTemplates();
    this.registerHelpers();
  }

  private loadTemplates() {
    const templatesDir = path.join(
      process.cwd(),
      'src',
      'helpers',
      'mail-html-contents',
    );
    const templateFiles = fs.readdirSync(templatesDir);

    templateFiles
      .filter((file) => file.endsWith('.hbs'))
      .forEach((file) => {
        const templateName = file.replace('.hbs', '');
        const templatePath = path.join(templatesDir, file);
        const templateContent = fs.readFileSync(templatePath, 'utf8');

        this.templates.set(templateName, Handlebars.compile(templateContent));
      });
  }

  private registerHelpers() {
    Handlebars.registerHelper('currentYear', () => new Date().getFullYear());
  }

  render(templateName: string, data: any): string {
    const template = this.templates.get(templateName);

    if (!template) {
      throw new Error(`Template '${templateName}' bulunamadı`);
    }

    return template(data);
  }
}
