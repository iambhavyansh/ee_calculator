import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Activity } from "lucide-react";
import { CalculatorMetadata } from "@/api/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CalculatorCardProps {
  calculator: CalculatorMetadata;
}

export const CalculatorCard: React.FC<CalculatorCardProps> = ({ calculator }) => {
  return (
    <Link to={calculator.endpoint} className="block group h-full">
      <Card className="h-full flex flex-col justify-between transition-all duration-300 ease-out hover:scale-[1.02] hover:border-primary hover:shadow-md border-border bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-primary" />
              {calculator.category_label}
            </span>
            <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider">
              {calculator.execution}
            </Badge>
          </div>
          <CardTitle className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
            {calculator.name}
          </CardTitle>
          <CardDescription className="text-xs line-clamp-2 mt-1">
            {calculator.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0 pb-4">
          <div className="flex items-center text-xs font-medium text-primary gap-1 group-hover:translate-x-1 transition-transform">
            <span>Open Calculator</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

