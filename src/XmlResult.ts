class XmlResult {
    private static instance: XmlResult;
    public data: any;

    private constructor() {}

    static getInstance(): XmlResult {
        if (!XmlResult.instance) {
            XmlResult.instance = new XmlResult();
        }
        return XmlResult.instance;
    }
}

export const xmlResult = XmlResult.getInstance();