declare module 'next/server' {
    export interface NextRequest extends Request {
        nextUrl: URL;
    }

    export class NextResponse extends Response {
        constructor(body?: BodyInit | null, init?: ResponseInit);
        static json(body: any, init?: ResponseInit): NextResponse;
        static redirect(url: string | URL, init?: number | ResponseInit): NextResponse;
        static rewrite(url: string | URL, init?: ResponseInit): NextResponse;
        static next(init?: ResponseInit): NextResponse;
    }
}

declare module 'next/dist/shared/lib/utils' {
    export interface NEXT_DATA {
        props: any;
        page: string;
        query: any;
        buildId: string;
        assetPrefix?: string;
        runtimeConfig?: { [key: string]: any };
        nextExport?: boolean;
        autoExport?: boolean;
        isFallback?: boolean;
        dynamicIds?: string[];
        err?: Error & { statusCode?: number };
        gsp?: boolean;
        gssp?: boolean;
        customServer?: boolean;
        gip?: boolean;
        appGip?: boolean;
        locale?: string;
        locales?: string[];
        defaultLocale?: string;
        domainLocales?: { [key: string]: any }[];
        scriptLoader?: { [key: string]: any }[];
        isPreview?: boolean;
    }
} 